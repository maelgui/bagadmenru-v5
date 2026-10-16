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
    Resource,
    payload_can_manage_campaigns,
)
from bbe2.utils.correlation import get_correlation_id

campaigns_router = APIRouter(prefix="/campaigns")

CAMPAIGN_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found"
)


def _can_manage(payload: schemas.JwtPayload) -> bool:
    return payload_can_manage_campaigns(payload)


def _campaign_response(db_campaign: models.CampaignDB) -> schemas.Campaign:
    campaign = schemas.Campaign.model_validate(db_campaign)
    if db_campaign.events:
        event_dates = [event.date.date() for event in db_campaign.events]
        campaign.first_event_date = min(event_dates)
        campaign.last_event_date = max(event_dates)
    return campaign


@campaigns_router.get("/", response_model=list[schemas.CampaignListItem])
async def list_campaigns(
    payload: Annotated[
        schemas.JwtPayload, Depends(Authorization(Action.VIEW, Resource.CAMPAIGN))
    ],
    campaign_crud: Annotated[CRUDCampaign, Depends()],
):
    rows = campaign_crud.find_all_ordered(include_drafts=_can_manage(payload))
    items = []
    for db_campaign, first_event_date, last_event_date in rows:
        item = schemas.CampaignListItem.model_validate(db_campaign)
        item.first_event_date = first_event_date.date() if first_event_date else None
        item.last_event_date = last_event_date.date() if last_event_date else None
        items.append(item)
    return items


@campaigns_router.get("/{campaign_id}", response_model=schemas.Campaign)
async def get_campaign(
    campaign_id: int,
    payload: Annotated[
        schemas.JwtPayload, Depends(Authorization(Action.VIEW, Resource.CAMPAIGN))
    ],
    campaign_crud: Annotated[CRUDCampaign, Depends()],
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    if db_campaign.status == "draft" and not _can_manage(payload):
        raise CAMPAIGN_NOT_FOUND

    return _campaign_response(db_campaign)


@campaigns_router.post(
    "/",
    response_model=schemas.Campaign,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.CAMPAIGN))],
)
async def create_campaign(
    campaign: schemas.CampaignCreate,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
):
    group = session.get(models.GroupDB, campaign.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Group not found",
        )

    db_campaign = campaign_crud.create(**campaign.model_dump(), status="draft")
    return campaign_crud.get_with_events(db_campaign.id)


@campaigns_router.patch(
    "/{campaign_id}",
    response_model=schemas.Campaign,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.CAMPAIGN))],
)
async def update_campaign(
    campaign_id: int,
    campaign: schemas.CampaignUpdate,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    db_campaign = campaign_crud.update(db_campaign, campaign)
    return _campaign_response(db_campaign)


@campaigns_router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.DELETE, Resource.CAMPAIGN))],
)
async def delete_campaign(
    campaign_id: int,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
):
    db_campaign = campaign_crud.find_one_by(models.CampaignDB.id == campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND
    campaign_crud.delete(campaign_id)


@campaigns_router.post(
    "/{campaign_id}/publish",
    response_model=schemas.Campaign,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.CAMPAIGN))],
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

    correlation_id = get_correlation_id()
    for db_event in db_campaign.events:
        if db_event.is_in_doodle:
            event_schema = schemas.EventCreate.model_validate(
                db_event, from_attributes=True
            )
            background_tasks.add_task(
                notify_new_event,
                sender,
                settings,
                event_schema,
                db_event.id,
                correlation_id,
            )

    return _campaign_response(db_campaign)


@campaigns_router.post(
    "/{campaign_id}/archive",
    response_model=schemas.Campaign,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.CAMPAIGN))],
)
async def archive_campaign(
    campaign_id: int,
    campaign_crud: Annotated[CRUDCampaign, Depends()],
    session: SessionDep,
):
    db_campaign = campaign_crud.get_with_events(campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

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


@campaigns_router.post(
    "/{campaign_id}/events/{event_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.CAMPAIGN))],
)
async def link_event(
    campaign_id: int,
    event_id: int,
    session: SessionDep,
):
    db_campaign = session.get(models.CampaignDB, campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    db_event = session.get(models.EventDB, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    if db_event.campaign_id is not None and db_event.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is already linked to a campaign",
        )

    db_event.campaign_id = campaign_id
    session.commit()


@campaigns_router.delete(
    "/{campaign_id}/events/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.CAMPAIGN))],
)
async def unlink_event(
    campaign_id: int,
    event_id: int,
    session: SessionDep,
):
    db_campaign = session.get(models.CampaignDB, campaign_id)
    if not db_campaign:
        raise CAMPAIGN_NOT_FOUND

    db_event = session.get(models.EventDB, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    db_event.campaign_id = None
    session.commit()


router = APIRouter()
router.include_router(campaigns_router)
