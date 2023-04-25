from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from bbe2 import schemas
from bbe2.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    date = Column(DateTime)
    costume = Column(Enum(schemas.Costume))

    responses = relationship("Response", back_populates="event")
