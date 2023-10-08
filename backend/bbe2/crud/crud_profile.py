from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDProfile(
    CRUDBase[models.Profile, schemas.ProfileCreate, schemas.ProfileUpdate]
):
    model = models.Profile
