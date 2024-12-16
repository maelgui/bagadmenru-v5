from bbe2 import models
from bbe2.crud.base import CRUDBase


class CRUDPhoto(CRUDBase):
    model = models.PhotoDB
