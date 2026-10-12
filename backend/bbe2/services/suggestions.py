from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import Depends
from sqlalchemy import select

from bbe2 import models
from bbe2.dependencies import SessionDep
from bbe2.models.file_access import FileAccessDB
from bbe2.models.user import user_group_association_table
from bbe2.schemas.file import FileOrFolderType, Suggestion, SuggestionReason

TREND_HALF_LIFE_DAYS = 7.0
TREND_WINDOW_DAYS = 30
MIN_GROUP_MEMBERS = 3
SUGGESTION_LIMIT = 8


class SuggestionService:
    def __init__(self, session: SessionDep):
        self.session = session

    def suggestions(self, user_id: str, folder_id: Optional[int]) -> list[Suggestion]:
        scope_ids = self._scope_file_ids(folder_id)
        if scope_ids is not None and not scope_ids:
            return []

        reasons: dict[int, tuple[SuggestionReason, Optional[str]]] = {}
        scores: dict[int, float] = {}

        for file_id, score, group_name in self._group_affinity(user_id, scope_ids):
            reasons[file_id] = (SuggestionReason.GROUP, group_name)
            scores[file_id] = score + 2.0

        for file_id, score in self._trend_scores(scope_ids, member_ids=None):
            if file_id not in reasons:
                reasons[file_id] = (SuggestionReason.TRENDING, None)
            scores.setdefault(file_id, score + 1.0)

        for file_id in self._recent_file_ids(scope_ids):
            if file_id not in reasons:
                reasons[file_id] = (SuggestionReason.RECENT, None)
            scores.setdefault(file_id, 0.0)

        ranked = sorted(reasons.keys(), key=lambda fid: scores[fid], reverse=True)
        ranked = ranked[:SUGGESTION_LIMIT]
        files = self._load_files(ranked)
        return [
            Suggestion(
                file=files[fid],
                reason=reasons[fid][0],
                group_name=reasons[fid][1],
            )
            for fid in ranked
            if fid in files
        ]

    def _scope_file_ids(self, folder_id: Optional[int]) -> Optional[set[int]]:
        if folder_id is None:
            return None
        node = models.FileOrFolderDB
        descendants = (
            select(node.id)
            .where(node.id == folder_id)
            .cte(name="descendants", recursive=True)
        )
        child = node.__table__.alias()
        descendants = descendants.union_all(
            select(child.c.id).where(child.c.parent_id == descendants.c.id)
        )
        rows = self.session.execute(
            select(node.id)
            .join(descendants, node.id == descendants.c.id)
            .where(node.type == FileOrFolderType.FILE)
        ).all()
        return {row[0] for row in rows}

    def _trend_scores(
        self, scope_ids: Optional[set[int]], member_ids: Optional[list[str]]
    ) -> list[tuple[int, float]]:
        window_start = datetime.now(timezone.utc) - timedelta(days=TREND_WINDOW_DAYS)
        query = select(FileAccessDB.file_id, FileAccessDB.at).where(
            FileAccessDB.at > window_start
        )
        if member_ids is not None:
            query = query.where(FileAccessDB.user_id.in_(member_ids))
        if scope_ids is not None:
            query = query.where(FileAccessDB.file_id.in_(scope_ids))

        now = datetime.now(timezone.utc)
        scores: dict[int, float] = {}
        for file_id, at in self.session.execute(query).all():
            age_days = (now - _as_aware(at)).total_seconds() / 86400.0
            weight = 0.5 ** (age_days / TREND_HALF_LIFE_DAYS)
            scores[file_id] = scores.get(file_id, 0.0) + weight
        return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

    def _group_affinity(
        self, user_id: str, scope_ids: Optional[set[int]]
    ) -> list[tuple[int, float, str]]:
        best: dict[int, tuple[float, str]] = {}
        for group_id, group_name in self._eligible_groups(user_id):
            member_ids = self._group_member_ids(group_id)
            if len(member_ids) < MIN_GROUP_MEMBERS:
                continue
            for file_id, score in self._trend_scores(scope_ids, member_ids=member_ids):
                if file_id not in best or score > best[file_id][0]:
                    best[file_id] = (score, group_name)
        return [(fid, score, name) for fid, (score, name) in best.items()]

    def _eligible_groups(self, user_id: str) -> list[tuple[int, str]]:
        user = self.session.get(models.UserDB, user_id)
        if user is None:
            return []
        groups: dict[int, str] = {}
        if user.instrument is not None:
            groups[user.instrument.id] = user.instrument.name
        for group in user.groups:
            groups[group.id] = group.name
        return list(groups.items())

    def _group_member_ids(self, group_id: int) -> list[str]:
        assoc = user_group_association_table
        rows = self.session.execute(
            select(models.UserDB.id)
            .outerjoin(assoc, assoc.c.profile_id == models.UserDB.id)
            .where(
                (models.UserDB.instrument_id == group_id)
                | (assoc.c.group_id == group_id)
            )
            .distinct()
        ).all()
        return [row[0] for row in rows]

    def _recent_file_ids(self, scope_ids: Optional[set[int]]) -> list[int]:
        node = models.FileOrFolderDB
        query = (
            select(node.id)
            .where(node.type == FileOrFolderType.FILE)
            .order_by(node.uploaded_at.desc())
            .limit(SUGGESTION_LIMIT)
        )
        if scope_ids is not None:
            query = query.where(node.id.in_(scope_ids))
        return [row[0] for row in self.session.execute(query).all()]

    def _load_files(self, file_ids: list[int]) -> dict[int, models.FileOrFolderDB]:
        if not file_ids:
            return {}
        node = models.FileOrFolderDB
        return {
            f.id: f
            for f in self.session.execute(
                select(node).where(node.id.in_(file_ids))
            ).scalars()
        }


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


SuggestionServiceDep = Annotated[SuggestionService, Depends(SuggestionService)]
