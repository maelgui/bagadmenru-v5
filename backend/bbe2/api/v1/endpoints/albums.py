from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Security, UploadFile, status

from bbe2 import models, schemas
from bbe2.crud.crud_album import CRUDAlbum
from bbe2.crud.crud_photo import CRUDPhoto
from bbe2.utils.auth import get_current_user
from bbe2.utils import s3
from bbe2.utils.scopes import AlbumScopes

router = APIRouter(prefix="/albums")


@router.get("/", response_model=list[schemas.Album])
async def list_albums(
    album_crud: Annotated[CRUDAlbum, Depends()],
    token: str = Security(get_current_user, scopes=[str(AlbumScopes.VIEW)]),
):
    return album_crud.find_all()


@router.get("/{album_id}", response_model=schemas.Album)
async def get_album(
    album_id: str,
    token: str = Security(get_current_user, scopes=[AlbumScopes.VIEW]),
    album_crud: CRUDAlbum = Depends(),
):
    db_album = album_crud.find_one_by(models.Album.id == album_id)
    if not db_album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Album not found"
        )
    return db_album


@router.get("/{album_id}/photos", response_model=list[schemas.Photo])
async def list_album_photos(
    album_id: str,
    token: str = Security(get_current_user, scopes=[AlbumScopes.VIEW]),
    photo_crud: CRUDPhoto = Depends(),
):
    return photo_crud.find_by(models.Photo.album_id == album_id)


@router.post("/{album_id}/photos", response_model=schemas.Photo)
async def upload_file(
    album_id: str,
    file: UploadFile,
    token: str = Security(get_current_user, scopes=[AlbumScopes.CREATE]),
    photo_crud: CRUDPhoto = Depends(),
):
    filename = str(uuid.uuid4())
    s3.upload_file(file.file, "photos", filename)
    return photo_crud.create(url=filename)


@router.post("/", response_model=schemas.Album, status_code=status.HTTP_201_CREATED)
async def create_album(
    album: schemas.AlbumCreate,
    album_crud: CRUDAlbum = Depends(),
    token: str = Security(get_current_user, scopes=[AlbumScopes.CREATE]),
):
    return album_crud.create(**album.dict())


@router.put("/{album_id}", response_model=schemas.Album)
async def update_album(
    album_id: str,
    album: schemas.AlbumCreate,
    token: str = Security(get_current_user, scopes=[AlbumScopes.UPDATE]),
    album_crud: CRUDAlbum = Depends(),
):
    db_album = album_crud.find_one_by(models.Album.id == album_id)
    if not db_album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )
    db_album = album_crud.update(db_object=db_album, update_object=album)
    return db_album


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: str,
    token: str = Security(get_current_user, scopes=[AlbumScopes.DELETE]),
    album_crud: CRUDAlbum = Depends(),
):
    db_album = album_crud.find_one_by(models.Album.id == album_id)
    if not db_album:
        raise HTTPException(status_code=404, detail="Album not found")
    album_crud.delete(album_id)


@router.delete("/{album_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    album_id: str,
    photo_id: str,
    token: str = Security(get_current_user, scopes=[str(AlbumScopes.DELETE)]),
    photo_crud: CRUDPhoto = Depends(),
):
    db_photo = photo_crud.find_one_by(
        models.Photo.id == photo_id, models.Photo.album_id == album_id
    )
    if not db_photo:
        raise HTTPException(status_code=404, detail="Album not found")
    photo_crud.delete(photo_id)
