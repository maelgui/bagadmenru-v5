import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from bbe2.database import Base

class UpdateAction(enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class Update(Base):
    __tablename__ = "updates"

    id = Column(Integer, primary_key=True)
    updated_at = Column(DateTime, server_default=func.now())
    updated_by_id = Column(Integer, ForeignKey("profiles.id"))
    updated_by = relationship("Profile")
    action = Column(Enum(UpdateAction))
    entity_type = Column(String)
    entity_id = Column(String)
