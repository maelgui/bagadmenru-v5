from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDInstrument(
    CRUDBase[models.Instrument, schemas.Instrument, schemas.Instrument]
):
    model = models.Instrument
