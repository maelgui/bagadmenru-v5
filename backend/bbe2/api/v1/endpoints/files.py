"""File system API."""

import uuid
from typing import Annotated, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import and_, func
from sqlalchemy.orm import aliased

from bbe2 import models, schemas
from bbe2.config import Settings
from bbe2.crud import CRUDFile
from bbe2.dependencies import S3Dep, SessionDep, SettingsDep, get_s3_helper
from bbe2.schemas.file import FileOrFolderType
from bbe2.services.conversion import ConversionService, source_format_for
from bbe2.utils.auth import Action, Authorization, Resource
from bbe2.utils.s3 import S3Helper

router = APIRouter(prefix="/files")


@router.get(
    "/",
    dependencies=[
        Depends(Authorization(Action.VIEW, Resource.FILE)),
        Depends(get_s3_helper),
    ],
    response_model=list[schemas.FileOrFolder],
)
async def list_files(
    session: SessionDep,
    t: Optional[FileOrFolderType] = None,
    limit: int = 10,
):
    """List recent files."""
    q = session.query(models.FileOrFolderDB)
    if t:
        q = q.filter(models.FileOrFolderDB.type == t)
    q = q.order_by(models.FileOrFolderDB.uploaded_at.desc())
    q = q.limit(limit)

    return q.all()


@router.get(
    "/root",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.FILE))],
    response_model=schemas.FileOrFolder,
)
async def get_root(
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Get root folder entity."""
    root_file = file_crud.find_one_by(
        models.FileOrFolderDB.name == "root",
        models.FileOrFolderDB.parent_id.is_(None),
        models.FileOrFolderDB.type == FileOrFolderType.DIRECTORY,
    )
    if not root_file:
        root_file = file_crud.create(
            type=FileOrFolderType.DIRECTORY,
            name="root",
        )
    return root_file


@router.get(
    "/{file_id}",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.FILE))],
    response_model=schemas.FileOrFolder,
)
async def get_file(
    file_id: int,
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Get a file or folder by id."""
    db_file = file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    return db_file


@router.get(
    "/{file_id}/breadcrumb",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.FILE))],
    response_model=list[schemas.FileOrFolder],
)
async def get_breadcrumb(
    file_id: int,
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Get breadcrumb for a file."""
    db_file = file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    breadcrumb = [db_file]
    while breadcrumb[-1].parent_id:
        next_file = file_crud.find_one_by(
            models.FileOrFolderDB.id == breadcrumb[-1].parent_id
        )
        if not next_file:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        breadcrumb.append(next_file)

    breadcrumb.reverse()
    return breadcrumb


@router.get(
    "/{folder_id}/children",
    dependencies=[
        Depends(Authorization(Action.VIEW, Resource.FILE)),
        Depends(get_s3_helper),
    ],
    response_model=list[schemas.FileOrFolder],
)
async def list_children(
    folder_id: int,
    session: SessionDep,
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Get all chidren of a folder."""
    db_file = file_crud.find_one_by(models.FileOrFolderDB.id == folder_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    grandchild = aliased(models.FileOrFolderDB)
    rows = (
        session.query(
            models.FileOrFolderDB,
            func.count(grandchild.id),  # pylint: disable=not-callable
        )
        .outerjoin(grandchild, grandchild.parent_id == models.FileOrFolderDB.id)
        .filter(models.FileOrFolderDB.parent_id == folder_id)
        .group_by(models.FileOrFolderDB.id)
        .order_by(models.FileOrFolderDB.id)
        .all()
    )

    result = []
    for child, grandchild_count in rows:
        item = schemas.FileOrFolder.model_validate(child)
        if child.type in (FileOrFolderType.DIRECTORY, FileOrFolderType.CONTAINER):
            item.child_count = grandchild_count
        result.append(item)
    return result


@router.post(
    "/{folder_id}/upload",
    dependencies=[Depends(Authorization(Action.CREATE, Resource.FILE))],
    response_model=schemas.FileOrFolder,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    folder_id: int,
    file: UploadFile,
    file_crud: Annotated[CRUDFile, Depends()],
    s3: S3Dep,
    settings: SettingsDep,
    background_tasks: BackgroundTasks,
    force: bool = False,
):
    """Upload a file."""
    folder = file_crud.find_one_by(models.FileOrFolderDB.id == folder_id)
    if folder and folder.type == FileOrFolderType.CONTAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot upload into a container",
        )

    src_format = source_format_for(file.filename or "")

    existing = file_crud.find_one_by(
        and_(
            models.FileOrFolderDB.name == file.filename,
            models.FileOrFolderDB.parent_id == folder_id,
        )
    )

    if existing:
        if not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="File already exists"
            )
        if existing.type == FileOrFolderType.CONTAINER and src_format:
            return _reupload_container(
                existing, file, file_crud, s3, settings, background_tasks
            )
        _delete_node_s3(existing, s3)
        file_crud.delete(existing.id)

    filename = "files/" + str(uuid.uuid4())
    s3.upload_file(file.file, filename, content_type=file.content_type)

    created = file_crud.create(
        type=FileOrFolderType.CONTAINER if src_format else FileOrFolderType.FILE,
        name=file.filename,
        file_key=filename,
        parent_id=folder_id,
        source_format=src_format,
        processing_status="pending" if src_format else None,
    )

    if src_format:
        _enqueue_generation(created.id, settings, s3, background_tasks)

    return created


def _reupload_container(
    container: models.FileOrFolderDB,
    file: UploadFile,
    file_crud: CRUDFile,
    s3: S3Helper,
    settings: Settings,
    background_tasks: BackgroundTasks,
) -> models.FileOrFolderDB:
    new_key = "files/" + str(uuid.uuid4())
    s3.upload_file(file.file, new_key, content_type=file.content_type)

    old_keys = [child.file_key for child in container.children if child.file_key]
    if container.file_key:
        old_keys.append(container.file_key)
    for child in list(container.children):
        file_crud.delete(child.id)

    container.file_key = new_key
    container.processing_status = "pending"
    container.processing_failure_reason = None
    file_crud.db_session.flush()
    file_crud.db_session.refresh(container)

    for key in old_keys:
        s3.delete_object(key)

    _enqueue_generation(container.id, settings, s3, background_tasks)
    return container


def _enqueue_generation(
    container_id: int,
    settings: Settings,
    s3: S3Helper,
    background_tasks: BackgroundTasks,
) -> None:
    service = ConversionService(settings, s3)
    background_tasks.add_task(service.generate, container_id)


def _delete_node_s3(node: models.FileOrFolderDB, s3: S3Helper) -> None:
    if node.type == FileOrFolderType.CONTAINER:
        for child in node.children:
            if child.file_key:
                s3.delete_object(child.file_key)
        if node.file_key:
            s3.delete_object(node.file_key)
    elif node.type == FileOrFolderType.FILE and node.file_key:
        s3.delete_object(node.file_key)


@router.post(
    "/{folder_id}",
    dependencies=[Depends(Authorization(Action.CREATE, Resource.FILE))],
    response_model=schemas.FileOrFolder,
    status_code=status.HTTP_201_CREATED,
)
async def create_folder(
    folder_id: int,
    new_folder: schemas.FolderCreate,
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Create a new folder."""
    parent = file_crud.find_one_by(models.FileOrFolderDB.id == folder_id)
    if parent and parent.type == FileOrFolderType.CONTAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create a folder inside a container",
        )
    return file_crud.create(
        parent_id=folder_id, type=FileOrFolderType.DIRECTORY, **new_folder.model_dump()
    )


@router.put(
    "/{file_id}",
    dependencies=[Depends(Authorization(Action.EDIT, Resource.FILE))],
    response_model=schemas.FileOrFolder,
)
async def update_file(
    file_id: int,
    file: schemas.FileOrFolderUpdate,
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Update an existing file or folder"""
    db_file = file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if _parent_is_container(db_file, file_crud):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Container content cannot be modified individually",
        )
    db_file = file_crud.update(db_file, file)
    return db_file


def _parent_is_container(node: models.FileOrFolderDB, file_crud: CRUDFile) -> bool:
    if node.parent_id is None:
        return False
    parent = file_crud.find_one_by(models.FileOrFolderDB.id == node.parent_id)
    return parent is not None and parent.type == FileOrFolderType.CONTAINER


@router.delete(
    "/{file_id}",
    dependencies=[Depends(Authorization(Action.DELETE, Resource.FILE))],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_file(
    file_id: int,
    file_crud: Annotated[CRUDFile, Depends()],
    s3: S3Dep,
):
    """Delete an existing file or folder."""
    db_file = file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if _parent_is_container(db_file, file_crud):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Container content cannot be deleted individually",
        )
    _delete_node_s3(db_file, s3)
    file_crud.delete(file_id)
