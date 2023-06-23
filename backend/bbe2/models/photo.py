from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from bbe2 import schemas
from bbe2.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    url = Column(String)
    is_root = Column(Boolean)
    type = Column(Enum(schemas.FileOrFolderType))

    album_id = Column(Integer, ForeignKey("albums.id"))
    album = relationship("Album")
