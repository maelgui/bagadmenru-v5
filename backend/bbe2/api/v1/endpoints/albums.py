import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from bbe2 import models, schemas
from bbe2.crud.crud_album import CRUDAlbum
from bbe2.crud.crud_photo import CRUDPhoto
from bbe2.dependencies import S3Dep
from bbe2.utils.auth import Action, Authorization, Resource

router = APIRouter(prefix="/albums")


@router.get(
    "/",
    response_model=list[schemas.Album],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ALBUM))],
)
async def list_albums(
    album_crud: Annotated[CRUDAlbum, Depends()],
):
    return album_crud.find_all()


@router.get(
    "/{album_id}",
    response_model=schemas.Album,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ALBUM))],
)
async def get_album(
    album_id: str,
    album_crud: CRUDAlbum = Depends(),
):
    db_album = album_crud.find_one_by(models.Album.id == album_id)
    if not db_album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Album not found"
        )
    return db_album


@router.get(
    "/{album_id}/photos",
    response_model=list[schemas.Photo],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.PHOTO))],
)
async def list_album_photos(
    album_id: str,
    photo_crud: CRUDPhoto = Depends(),
):
    return photo_crud.find_by(models.Photo.album_id == album_id)


@router.post(
    "/{album_id}/photos",
    response_model=schemas.Photo,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.PHOTO))],
)
async def upload_file(
    album_id: int,
    file: UploadFile,
    s3_helper: S3Dep,
    photo_crud: CRUDPhoto = Depends(),
):
    filename = str(uuid.uuid4())
    s3_helper.upload_file(file.file, "photos", filename)
    return photo_crud.create(url=filename)


@router.post(
    "/",
    response_model=schemas.Album,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.ALBUM))],
)
async def create_album(
    album: schemas.AlbumCreate,
    album_crud: CRUDAlbum = Depends(),
):
    return album_crud.create(**album.model_dump())


@router.put(
    "/{album_id}",
    response_model=schemas.Album,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.ALBUM))],
)
async def update_album(
    album_id: int,
    album: schemas.AlbumCreate,
    album_crud: CRUDAlbum = Depends(),
):
    db_album = album_crud.find_one_by(models.Album.id == album_id)
    if not db_album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )
    db_album = album_crud.update(db_object=db_album, update_object=album)
    return db_album


@router.delete(
    "/{album_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.DELETE, Resource.ALBUM))],
)
async def delete_album(
    album_id: int,
    album_crud: CRUDAlbum = Depends(),
):
    db_album = album_crud.find_one_by(models.Album.id == album_id)
    if not db_album:
        raise HTTPException(status_code=404, detail="Album not found")
    album_crud.delete(album_id)


@router.delete(
    "/{album_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.DELETE, Resource.PHOTO))],
)
async def delete_photo(
    album_id: str,
    photo_id: int,
    photo_crud: CRUDPhoto = Depends(),
):
    db_photo = photo_crud.find_one_by(models.Photo.id == photo_id)
    if not db_photo:
        raise HTTPException(status_code=404, detail="Album not found")
    photo_crud.delete(photo_id)
