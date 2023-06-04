from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from bbe2.database import Base


class Response(Base):
    __tablename__ = "responses"

    value = Column(Boolean, nullable=True)
    date = Column(DateTime)

    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)
    event = relationship("Event", back_populates="responses")
    user_id = Column(String, ForeignKey("profiles.id"), primary_key=True)
    user = relationship("Profile")
