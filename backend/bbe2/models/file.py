from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from bbe2 import schemas
from bbe2.database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    url = Column(String)
    is_root = Column(Boolean, nullable=False, default=False)
    type = Column(Enum(schemas.FileType))
    children = relationship("File")
    parent_id = Column(Integer, ForeignKey("files.id"))
