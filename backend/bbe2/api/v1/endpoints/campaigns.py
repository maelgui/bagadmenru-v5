from typing import Annotated, cast

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import CursorResult, update

from bbe2 import models, schemas
from bbe2.crud.crud_campaign import CRUDCampaign
from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.services.notifications import notify_new_event
from bbe2.utils.auth import (
    Action,
    Authorization,
    CampaignAuthorization,
    Resource,
    user_is_campaign_manager,
)

campaigns_router = APIRouter(prefix="/campaigns")

CAMPAIGN_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found"
)


# --- Read endpoints (any authenticated user) ---


@campaigns_router.get(
    "/",
    response_model=list[schemas.CampaignListItem],
)
async def list_campaigns(
    payload: Annotated[
        schemas.JwtPayload, Depends(Authorization(Action.VIEW, Resource.CAMPAIGN))
    ],
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
):
    include_drafts = user_is_campaign_manager(session, payload.sub)
    rows = campaign_crud.find_all_ordered(include_drafts=include_drafts)
    items = []
    for db_campaign, first_event_date, last_event_date in rows:
        item = schemas.CampaignListItem.model_validate(db_campaign)
        # The events.date column is a datetime; the schema contract is a date.
        item.first_event_date = first_event_date.date() if first_event_date else None
        item.last_event_date = last_event_date.date() if last_event_date else None
        items.append(item)
    return items


@campaigns_router.get(
    "/{campaign_id}",
    response_model=schemas.Campaign,
)
async def get_campaign(
    campaign_id: int,
    payload: Annotated[
        schemas.JwtPayload, Depends(Authorization(Action.VIEW, Resource.CAMPAIGN))
    ],
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    # Drafts are visible to campaign managers only. Return 404 (not 403) to
    # avoid leaking the existence of draft campaigns (Req 2.5, 14.2).
    if db_campaign.status == "draft" and not user_is_campaign_manager(
        session, payload.sub
    ):
        raise CAMPAIGN_NOT_FOUND

    return _campaign_response(db_campaign)


# --- Write endpoints (CampaignAuthorization - global role check) ---


@campaigns_router.post(
    "/",
    response_model=schemas.Campaign,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(CampaignAuthorization())],
)
async def create_campaign(
    campaign: schemas.CampaignCreate,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
):
    # Verify the group exists
    group = session.get(models.GroupDB, campaign.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Group not found",
        )

    # Status is server-enforced: campaigns are always created as drafts
    # (CampaignCreate has no status field; any client-sent status is ignored).
    db_campaign = campaign_crud.create(**campaign.model_dump(), status="draft")
    # Reload with relationships for the response
    return campaign_crud.get_with_events(db_campaign.id)


@campaigns_router.patch(
    "/{campaign_id}",
    response_model=schemas.Campaign,
    dependencies=[Depends(CampaignAuthorization())],
)
async def update_campaign(
    campaign_id: int,
    campaign: schemas.CampaignUpdate,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    # Only name/description/group_id can change here; status transitions go
    # through /publish and /archive (CampaignUpdate has no status field).
    db_campaign = campaign_crud.update(db_campaign, campaign)
    return db_campaign


@campaigns_router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(CampaignAuthorization())],
)
async def delete_campaign(
    campaign_id: int,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
):
    db_campaign = campaign_crud.find_one_by(models.CampaignDB.id == campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND
    # The FK ON DELETE SET NULL on events.campaign_id handles unlinking
    # events automatically at the database level.
    campaign_crud.delete(campaign_id)


# --- Status transition endpoints (CampaignAuthorization - global role check) ---


def _campaign_response(db_campaign: models.CampaignDB) -> schemas.Campaign:
    """Build a Campaign response with the derived event date range."""
    campaign = schemas.Campaign.model_validate(db_campaign)
    if db_campaign.events:
        # The events.date column is a datetime; the schema contract is a date.
        event_dates = [event.date.date() for event in db_campaign.events]
        campaign.first_event_date = min(event_dates)
        campaign.last_event_date = max(event_dates)
    return campaign


@campaigns_router.post(
    "/{campaign_id}/publish",
    response_model=schemas.Campaign,
    dependencies=[Depends(CampaignAuthorization())],
)
async def publish_campaign(
    campaign_id: int,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
    settings: SettingsDep,
    sender: SenderDep,
    background_tasks: BackgroundTasks,
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    # Conditional UPDATE: the status check and the transition happen in a
    # single atomic statement, so a concurrent publish of the same campaign
    # cannot both succeed and double-fire the notifications (Req 3.1, 3.3).
    result = cast(
        CursorResult,
        session.execute(
            update(models.CampaignDB)
            .where(
                models.CampaignDB.id == campaign_id,
                models.CampaignDB.status == "draft",
            )
            .values(status="active")
        ),
    )
    if result.rowcount == 0:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot publish a campaign with status '{db_campaign.status}'",
        )
    session.commit()

    # Deferred new-event notifications: fan out for each linked event that
    # requires attendance responses (Req 9.4, 9.5).
    for db_event in db_campaign.events:
        if db_event.is_in_doodle:
            event_schema = schemas.EventCreate.model_validate(
                db_event, from_attributes=True
            )
            background_tasks.add_task(
                notify_new_event, sender, settings, event_schema, db_event.id
            )

    return _campaign_response(db_campaign)


@campaigns_router.post(
    "/{campaign_id}/archive",
    response_model=schemas.Campaign,
    dependencies=[Depends(CampaignAuthorization())],
)
async def archive_campaign(
    campaign_id: int,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    # Atomic status check + transition (Req 3.2, 3.3).
    result = cast(
        CursorResult,
        session.execute(
            update(models.CampaignDB)
            .where(
                models.CampaignDB.id == campaign_id,
                models.CampaignDB.status == "active",
            )
            .values(status="archived")
        ),
    )
    if result.rowcount == 0:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot archive a campaign with status '{db_campaign.status}'",
        )
    session.commit()

    return _campaign_response(db_campaign)


# --- Event linking endpoints (CampaignAuthorization - global role check) ---


@campaigns_router.post(
    "/{campaign_id}/events/{event_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(CampaignAuthorization())],
)
async def link_event(
    campaign_id: int,
    event_id: int,
    session: SessionDep,
):
    # Check campaign exists
    db_campaign = session.get(models.CampaignDB, campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    # Check event exists
    db_event = session.get(models.EventDB, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    # Check event is not already linked to another campaign
    if db_event.campaign_id is not None and db_event.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is already linked to a campaign",
        )

    # Link the event to the campaign
    db_event.campaign_id = campaign_id
    session.commit()


@campaigns_router.delete(
    "/{campaign_id}/events/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(CampaignAuthorization())],
)
async def unlink_event(
    campaign_id: int,
    event_id: int,
    session: SessionDep,
):
    # Check campaign exists
    db_campaign = session.get(models.CampaignDB, campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    # Check event exists
    db_event = session.get(models.EventDB, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    # Unlink the event (set campaign_id to NULL)
    db_event.campaign_id = None
    session.commit()
