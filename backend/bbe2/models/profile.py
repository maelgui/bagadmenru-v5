from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from bbe2.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    picture_key = Column(String, nullable=True)
    instrument_id = Column(Integer, ForeignKey("instruments.id"))
    instrument = relationship("Instrument")

class Instrument(Base):
    __tablename__ = "instruments"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, nullable=False, default="#fff")
