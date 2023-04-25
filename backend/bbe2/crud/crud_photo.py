from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDPhoto(CRUDBase):
    model = models.Photo
