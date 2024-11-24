from abc import abstractmethod
from typing import Generic, Type, TypeVar

from pydantic import BaseModel

from bbe2.dependencies import SessionDep
from bbe2.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    @property
    @abstractmethod
    def model(self) -> Type[ModelType]:
        pass

    def __init__(self, db_session: SessionDep):
        self.db_session = db_session

    # Find operation
    def find_one_by(self, condition) -> ModelType | None:
        return self.db_session.query(self.model).filter(condition).first()

    def find_by(self, condition, skip: int = 0, limit: int = 100) -> list[ModelType]:
        return (
            self.db_session.query(self.model)
            .filter(condition)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_all(self, skip: int = 0, limit: int = 100) -> list[ModelType]:
        return self.db_session.query(self.model).offset(skip).limit(limit).all()

    # CRUD operation
    def create(self, **kwargs) -> ModelType:
        db_object = self.model(**kwargs)
        self.db_session.add(db_object)
        self.db_session.commit()
        self.db_session.refresh(db_object)
        return db_object

    def get(self, id: int) -> ModelType | None:
        return self.db_session.query(self.model).get(id)

    def update(
        self, db_object: ModelType, update_object: UpdateSchemaType
    ) -> ModelType:
        for key, value in update_object.dict(exclude_unset=True).items():
            setattr(db_object, key, value)
        self.db_session.commit()
        self.db_session.refresh(db_object)
        return db_object

    def delete(self, id: int):
        obj = self.db_session.query(self.model).get(id)
        self.db_session.delete(obj)
        self.db_session.commit()
