from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDFile(
    CRUDBase[models.FileOrFolderDB, schemas.FolderCreate, schemas.FileOrFolderUpdate]
):
    model = models.FileOrFolderDB
