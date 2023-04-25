from sqlalchemy import Column, DateTime, Integer, String

from bbe2.database import Base


class Album(Base):
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    date = Column(DateTime)
