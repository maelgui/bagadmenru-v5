from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDGroup(
    CRUDBase[models.Group, schemas.GroupCreate, schemas.GroupUpdate]
):
    model = models.Group
