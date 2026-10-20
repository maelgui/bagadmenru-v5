from sqlalchemy import Row, func
from sqlalchemy.orm import selectinload

from bbe2 import models, schemas
from bbe2.crud.base import CRUDBase


class CRUDCampaign(
    CRUDBase[models.CampaignDB, schemas.CampaignCreate, schemas.CampaignUpdate]
):
    model = models.CampaignDB

    def find_all_ordered(self, include_drafts: bool) -> list[Row]:
        # pylint: disable=not-callable
        query = (
            self.db_session.query(
                self.model,
                func.min(models.EventDB.date).label("first_event_date"),
                func.max(models.EventDB.date).label("last_event_date"),
            )
            .outerjoin(models.EventDB, models.EventDB.campaign_id == self.model.id)
            .options(selectinload(self.model.group))
            .group_by(self.model.id)
            .order_by(self.model.created_at.desc())
        )
        if not include_drafts:
            query = query.filter(self.model.status != "draft")
        return query.all()

    def get_with_events(self, campaign_id: int) -> models.CampaignDB | None:
        return (
            self.db_session.query(self.model)
            .options(
                selectinload(self.model.events),
                selectinload(self.model.group),
            )
            .filter(self.model.id == campaign_id)
            .first()
        )
