from sqlalchemy import Column, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from bbe2 import schemas
from bbe2.database import Base


class FileOrFolder(Base):
    """Database representation of file or folder entity."""

    __tablename__ = "files"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    url = Column(String)
    type = Column(Enum(schemas.FileOrFolderType))
    children = relationship("FileOrFolder")
    parent_id = Column(Integer, ForeignKey("files.id"))
    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="file_unique_per_folder"),
    )
