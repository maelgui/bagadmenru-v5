"""File system API."""

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import and_

from bbe2 import models, schemas
from bbe2.crud import CRUDFile
from bbe2.dependencies import S3Dep, SessionDep, get_s3_helper
from bbe2.schemas.file import FileOrFolderType
from bbe2.utils.auth import Action, Authorization, Resource

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
    q = session.query(models.FileOrFolder)
    if t:
        q = q.filter(models.FileOrFolder.type == t)
    q = q.order_by(models.FileOrFolder.uploaded_at.asc())
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
    root_file = file_crud.find_one_by(models.FileOrFolder.id == 1)
    if not root_file:
        root_file = file_crud.create(
            id=1,
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
    db_file = file_crud.find_one_by(models.FileOrFolder.id == file_id)
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
    db_file = file_crud.find_one_by(models.FileOrFolder.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    breadcrumb = [db_file]
    while breadcrumb[-1].parent_id:
        next_file = file_crud.find_one_by(
            models.FileOrFolder.id == breadcrumb[-1].parent_id
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
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Get all chidren of a folder."""
    db_file = file_crud.find_one_by(models.FileOrFolder.id == folder_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    return db_file.children


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
    force: bool = False,
):
    """Upload a file."""
    db_file = file_crud.find_one_by(
        and_(
            models.FileOrFolder.name == file.filename,
            models.FileOrFolder.parent_id == folder_id,
        )
    )
    if db_file:
        if not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="File already exists"
            )
        else:
            s3.delete_object(db_file.file_key)
            file_crud.delete(db_file.id)

    filename = "files/" + str(uuid.uuid4())
    s3.upload_file(file.file, filename, content_type=file.content_type)
    return file_crud.create(
        type=FileOrFolderType.FILE,
        name=file.filename,
        file_key=filename,
        parent_id=folder_id,
    )


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
    return file_crud.create(
        parent_id=folder_id, type=FileOrFolderType.DIRECTORY, **new_folder.model_dump()
    )


@router.put(
    "/{file_id}",
    dependencies=[Depends(Authorization(Action.EDIT, Resource.FILE))],
    response_model=schemas.FileOrFolder,
)
async def update_file(
    file_id: str,
    file: schemas.FileOrFolderUpdate,
    file_crud: Annotated[CRUDFile, Depends()],
):
    """Update an existing file or folder"""
    db_file = file_crud.find_one_by(models.FileOrFolder.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    db_file = file_crud.update(db_file, file)
    return db_file


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
    db_file = file_crud.find_one_by(models.FileOrFolder.id == file_id)
    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if db_file.type == FileOrFolderType.FILE:
        s3.delete_object(db_file.file_key)
    file_crud.delete(file_id)
