from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDResponse(
    CRUDBase[models.ResponseDB, schemas.ResponseCreate, schemas.ResponseCreate]
):
    model = models.ResponseDB
