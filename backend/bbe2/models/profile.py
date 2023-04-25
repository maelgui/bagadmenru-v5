from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship

from bbe2.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    picture = Column(String, nullable=True)
    is_init = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
