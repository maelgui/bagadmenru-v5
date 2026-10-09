"""File system API."""

from typing import Annotated, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import func
from sqlalchemy.orm import aliased

from bbe2 import models, schemas
from bbe2.crud import CRUDFile
from bbe2.dependencies import SessionDep, get_s3_helper
from bbe2.schemas.file import FileOrFolderType
from bbe2.services.files import (
    ContainerChildError,
    ContainerUploadError,
    FileAlreadyExistsError,
    FileNotFoundInStoreError,
    FileServiceDep,
)
from bbe2.utils.auth import Action, Authorization, JwtPayload, Resource

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
        .order_by(func.lower(models.FileOrFolderDB.name))
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
    response_model=schemas.FileOrFolder,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    folder_id: int,
    file: UploadFile,
    file_service: FileServiceDep,
    background_tasks: BackgroundTasks,
    payload: Annotated[
        JwtPayload, Depends(Authorization(Action.CREATE, Resource.FILE))
    ],
    force: bool = False,
):
    """Upload a file."""
    try:
        return file_service.upload(
            folder_id, file, payload.sub, background_tasks, force=force
        )
    except ContainerUploadError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot upload into a container",
        ) from exc
    except FileAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="File already exists"
        ) from exc


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
    response_model=schemas.FileOrFolder,
)
async def update_file(
    file_id: int,
    file: schemas.FileOrFolderUpdate,
    file_service: FileServiceDep,
    payload: Annotated[JwtPayload, Depends(Authorization(Action.EDIT, Resource.FILE))],
):
    """Update an existing file or folder"""
    try:
        return file_service.rename_or_move(file_id, file, payload.sub)
    except FileNotFoundInStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        ) from exc
    except ContainerChildError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Container content cannot be modified individually",
        ) from exc


@router.delete(
    "/{file_id}",
    dependencies=[Depends(Authorization(Action.DELETE, Resource.FILE))],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_file(
    file_id: int,
    file_service: FileServiceDep,
):
    """Delete an existing file or folder."""
    try:
        file_service.delete(file_id)
    except FileNotFoundInStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        ) from exc
    except ContainerChildError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Container content cannot be deleted individually",
        ) from exc
