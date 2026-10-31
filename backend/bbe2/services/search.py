from typing import Annotated, Optional

from fastapi import Depends
from sqlalchemy import ColumnElement, and_, case, func, or_, select
from sqlalchemy.orm import aliased, selectinload
from sqlalchemy.sql.elements import SQLCoreOperations

from bbe2 import models, schemas
from bbe2.dependencies import SessionDep
from bbe2.schemas.file import FileOrFolderType
from bbe2.utils.auth import Action, AuthContext, Resource, is_granted

LIKE_ESCAPE = "\\"
SEARCHABLE_FILE_TYPES = (
    FileOrFolderType.FILE,
    FileOrFolderType.DIRECTORY,
    FileOrFolderType.CONTAINER,
)


def _escape_like(value: str) -> str:
    return (
        value.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2)
        .replace("%", LIKE_ESCAPE + "%")
        .replace("_", LIKE_ESCAPE + "_")
    )


def _contains_all(
    haystack: SQLCoreOperations[str], tokens: list[str]
) -> ColumnElement[bool]:
    normalized = func.unaccent(haystack)
    return and_(
        *(
            normalized.ilike(func.unaccent(f"%{_escape_like(t)}%"), escape=LIKE_ESCAPE)
            for t in tokens
        )
    )


def _prefix_rank(haystack: SQLCoreOperations[str], query: str) -> ColumnElement[int]:
    starts_with = func.unaccent(haystack).ilike(
        func.unaccent(f"{_escape_like(query)}%"), escape=LIKE_ESCAPE
    )
    return case((starts_with, 0), else_=1)


class SearchService:
    def __init__(self, session: SessionDep):
        self.session = session

    def search(
        self, query: str, auth: AuthContext, limit: int
    ) -> schemas.SearchResults:
        query = " ".join(query.split())
        tokens = query.split(" ") if query else []
        results = schemas.SearchResults(events=[], profiles=[], files=[])
        if not tokens:
            return results

        if is_granted(auth, Action.VIEW, Resource.EVENT):
            results.events = [
                schemas.Event.model_validate(e)
                for e in self._events(query, tokens, limit)
            ]
        if is_granted(auth, Action.VIEW, Resource.PROFILE):
            results.profiles = [
                schemas.Profile.model_validate(p)
                for p in self._profiles(query, tokens, limit)
            ]
        if is_granted(auth, Action.VIEW, Resource.FILE):
            results.files = self._files(query, tokens, limit)
        return results

    def _events(self, query: str, tokens: list[str], limit: int):
        event = models.EventDB
        stmt = (
            select(event)
            .where(_contains_all(event.title + " " + event.description, tokens))
            .order_by(_prefix_rank(event.title, query), event.date.desc())
            .limit(limit)
        )
        return self.session.scalars(stmt).all()

    def _profiles(self, query: str, tokens: list[str], limit: int):
        user = models.UserDB
        full_name = user.first_name + " " + user.last_name
        stmt = (
            select(user)
            .where(user.is_active)
            .where(_contains_all(full_name + " " + user.email, tokens))
            .order_by(_prefix_rank(full_name, query), user.last_name, user.first_name)
            .options(selectinload(user.groups), selectinload(user.instrument))
            .limit(limit)
        )
        return self.session.scalars(stmt).all()

    def _files(
        self, query: str, tokens: list[str], limit: int
    ) -> list[schemas.FileHit]:
        file = models.FileOrFolderDB
        parent = aliased(models.FileOrFolderDB)
        stmt = (
            select(file)
            .outerjoin(parent, parent.id == file.parent_id)
            .where(file.parent_id.is_not(None))
            .where(file.type.in_(SEARCHABLE_FILE_TYPES))
            .where(or_(parent.id.is_(None), parent.type != FileOrFolderType.CONTAINER))
            .where(_contains_all(file.name, tokens))
            .order_by(_prefix_rank(file.name, query), file.name)
            .limit(limit)
        )
        files = self.session.scalars(stmt).all()
        if not files:
            return []
        folders = self._folders()
        return [
            schemas.FileHit(
                file=schemas.FileOrFolder.model_validate(f),
                path=self._path(f.parent_id, folders),
            )
            for f in files
        ]

    def _folders(self) -> dict[int, tuple[str, Optional[int]]]:
        folder = models.FileOrFolderDB
        rows = self.session.execute(
            select(folder.id, folder.name, folder.parent_id).where(
                folder.type.in_(
                    (FileOrFolderType.DIRECTORY, FileOrFolderType.CONTAINER)
                )
            )
        ).all()
        return {row.id: (row.name, row.parent_id) for row in rows}

    @staticmethod
    def _path(
        parent_id: Optional[int], folders: dict[int, tuple[str, Optional[int]]]
    ) -> list[str]:
        names: list[str] = []
        current = parent_id
        while current is not None and current in folders:
            name, next_parent = folders[current]
            if next_parent is None:
                break
            names.append(name)
            current = next_parent
        names.reverse()
        return names


SearchServiceDep = Annotated[SearchService, Depends()]
