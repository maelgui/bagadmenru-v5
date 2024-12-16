from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDAlbum(CRUDBase[models.AlbumDB, schemas.AlbumCreate, schemas.AlbumCreate]):
    model = models.AlbumDB
