from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDEvent(CRUDBase[models.Event, schemas.EventCreate, schemas.EventCreate]):
    model = models.Event
