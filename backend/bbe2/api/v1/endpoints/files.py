import uuid

from fastapi import (APIRouter, Depends, HTTPException, Security, UploadFile,
                     status)

from bbe2 import models, schemas
from bbe2.crud.crud_file import CRUDFile
from bbe2.dependencies.auth import get_current_user
from bbe2.schemas.file import FileType
from bbe2.utils import s3
from bbe2.utils.scopes import FileScopes

router = APIRouter(prefix="/files")

@router.get("/", response_model=schemas.File)
async def get_root(
    file_crud: CRUDFile = Depends(),
    token: str = Security(get_current_user, scopes=[FileScopes.VIEW]),
):
    root_file = file_crud.find_one_by(models.File.is_root == True)
    if not root_file:
        root_file = file_crud.create(
            id=1,
            type=FileType.DIRECTORY,
            name="root",
            is_root=True,
        )
    return root_file

@router.get("/{file_id}", response_model=schemas.File)
async def get_file(
    file_id: str,
    file_crud: CRUDFile = Depends(),
    token: str = Security(get_current_user, scopes=[FileScopes.VIEW]),
):
    db_file = file_crud.find_one_by(models.File.id == file_id)
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return db_file

@router.get("/{file_id}/children", response_model=list[schemas.File])
async def list_children(
    file_id: str,
    file_crud: CRUDFile = Depends(),
    token: str = Security(get_current_user, scopes=[FileScopes.VIEW]),
):
    db_file = file_crud.find_one_by(models.File.id == file_id)
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return db_file.children

@router.post("/", response_model=schemas.File, status_code=status.HTTP_201_CREATED)
async def create_file(
    file: UploadFile,
    file_crud: CRUDFile = Depends(),
    token: str = Security(get_current_user, scopes=[FileScopes.CREATE]),
):
    filename = str(uuid.uuid4())
    s3.upload_file(file.file, "files", filename)
    return file_crud.create(type=FileType.FILE, name=file.filename, url=filename)

@router.put("/{file_id}", response_model=schemas.File)
async def update_file(
    file_id: str,
    file: schemas.FileUpdate,
    file_crud: CRUDFile = Depends(),
    token: str = Security(get_current_user, scopes=[FileScopes.UPDATE]),
):
    db_file = file_crud.find_one_by(models.File.id == file_id)
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    db_file = file_crud.update(db_file, file)
    return db_file

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    file_crud: CRUDFile = Depends(),
    token: str = Security(get_current_user, scopes=[FileScopes.DELETE]),
):
    db_file = file_crud.find_one_by(models.File.id == file_id)
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    file_crud.delete(file_id)
