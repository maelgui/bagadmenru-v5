from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDFile(CRUDBase[models.File, schemas.FileCreate, schemas.FileUpdate]):
    model = models.File
