from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDAlbum(CRUDBase[models.Album, schemas.AlbumCreate, schemas.AlbumCreate]):
    model = models.Album
