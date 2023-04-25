from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDResponse(CRUDBase[models.Response, schemas.ResponseCreate, schemas.ResponseCreate]):
    model = models.Response
