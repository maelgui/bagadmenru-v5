from typing import Union
from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDProfile(
    CRUDBase[models.Profile, schemas.ProfileCreate, Union[schemas.ProfileUpdate, schemas.MyProfileUpdate]]
):
    model = models.Profile
