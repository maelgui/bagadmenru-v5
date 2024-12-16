from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDEvent(CRUDBase[models.EventDB, schemas.EventCreate, schemas.EventCreate]):
    model = models.EventDB
