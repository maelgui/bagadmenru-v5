from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from ics import Calendar, Event  # type: ignore
from pydantic import BaseModel
from sqlalchemy import or_, select

from bbe2 import models, schemas
from bbe2.crud import CRUDEvent
from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.services.notifications import notify_new_event
from bbe2.utils.auth import (
    Action,
    ActionTokenAuthorization,
    ActionTokenValue,
    Authorization,
    Resource,
    get_current_user2,
    user_is_campaign_manager,
)

events_router = APIRouter(prefix="/events")
responses_router = APIRouter(prefix="/responses")

### Events


@events_router.get(
    "/",
    response_model=list[schemas.Event],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.EVENT))],
)
async def list_events(
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
    limit: int = 10,
    date__gte: Optional[datetime] = None,
    date__lt: Optional[datetime] = None,
    is_in_doodle: Optional[bool] = None,
    linkable: Optional[bool] = None,
    ordering: str = "date",
):
    q = session.query(models.EventDB)
    # Draft visibility (Req 8.1, 8.2): an event is hidden iff it is linked to
    # a draft campaign and the viewer is not a campaign manager.
    if not user_is_campaign_manager(session, identifier):
        q = q.outerjoin(models.CampaignDB).filter(
            or_(
                models.EventDB.campaign_id.is_(None),
                models.CampaignDB.status != "draft",
            )
        )
    if linkable:
        q = q.filter(models.EventDB.campaign_id.is_(None))
    if date__gte:
        date__gte = date__gte.replace(hour=0, minute=0, second=0, microsecond=0)
        q = q.filter(models.EventDB.date >= date__gte)
    if date__lt:
        q = q.filter(models.EventDB.date < date__lt)
    if is_in_doodle:
        q = q.filter(models.EventDB.is_in_doodle == is_in_doodle)
    if ordering:
        order = "desc" if ordering.startswith("-") else "asc"
        col = getattr(models.EventDB, ordering.lstrip("-"))
        order = getattr(col, order)()
        q = q.order_by(order)
    q = q.limit(limit)
    return q.all()


@events_router.get(
    "/export/ics",
)
async def export_ics(
    session: SessionDep,
):
    events = session.query(models.EventDB).order_by(models.EventDB.date).all()
    c = Calendar()
    for event in events:
        e = Event()
        e.name = event.title
        e.description = event.description
        e.begin = event.date
        e.make_all_day()
        c.events.add(e)

    return Response(content=c.serialize(), media_type="text/calendar")


@events_router.get(
    "/{event_id}",
    response_model=schemas.Event,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.EVENT))],
)
async def get_event(
    event_id: int,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    db_event = event_crud.find_one_by(models.EventDB.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    # Draft visibility (Req 8.1, 8.4): an event linked to a draft campaign is
    # hidden (404) from viewers who are not campaign managers.
    if (
        db_event.campaign is not None
        and db_event.campaign.status == "draft"
        and not user_is_campaign_manager(session, identifier)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    return db_event


@events_router.post(
    "/",
    response_model=schemas.Event,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.EVENT))],
)
async def create_event(
    event: schemas.EventCreate,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
    settings: SettingsDep,
    sender: SenderDep,
    background_tasks: BackgroundTasks,
):
    # Campaign linkage (Req 7.1-7.4): only campaign managers may create an
    # event linked to a campaign, and the campaign must exist.
    campaign = None
    if event.campaign_id is not None:
        if not user_is_campaign_manager(session, identifier):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        campaign = session.get(models.CampaignDB, event.campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Campaign not found",
            )

    db_event = event_crud.create(**event.model_dump())

    # Deferred notification (Req 9.1-9.3): skip notify_new_event at creation
    # iff the event is linked to a draft campaign; notification happens at
    # publish time instead.
    campaign_is_draft = campaign is not None and campaign.status == "draft"
    if event.is_in_doodle and not campaign_is_draft:
        background_tasks.add_task(
            notify_new_event, sender, settings, event, db_event.id
        )

    return db_event


@events_router.put(
    "/{event_id}",
    response_model=schemas.Event,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.EVENT))],
)
async def update_event(
    event_id: int,
    event: schemas.EventCreate,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
):
    db_event = event_crud.find_one_by(models.EventDB.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    db_event = event_crud.update(db_event, event)
    return db_event


@events_router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.DELETE, Resource.EVENT))],
)
async def delete_event(
    event_id: int,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
):
    db_event = event_crud.find_one_by(models.EventDB.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    event_crud.delete(event_id)


## Responses


@responses_router.get(
    "/",
    response_model=list[schemas.Response],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.RESPONSE))],
)
async def list_responses(
    session: SessionDep,
    date__gte: Optional[datetime] = None,
    date__lt: Optional[datetime] = None,
    user_id: Optional[str] = None,
):
    q = select(models.ResponseDB)
    if user_id:
        q = q.filter(models.ResponseDB.user_id == user_id)
    if date__gte:
        date__gte = date__gte.replace(hour=0, minute=0, second=0, microsecond=0)
        q = q.filter(models.ResponseDB.event.has(models.EventDB.date >= date__gte))
    if date__lt:
        q = q.filter(models.ResponseDB.event.has(models.EventDB.date < date__lt))
    responses = session.scalars(q).all()
    return responses


@events_router.put(
    "/{event_id}/responses",
    response_model=schemas.Response,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.RESPONSE))],
)
async def create_response(
    event_id: int,
    response: schemas.ResponseCreate,
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    db_event = session.get(models.EventDB, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    # Campaign eligibility check
    if db_event.campaign_id:
        campaign = session.get(models.CampaignDB, db_event.campaign_id)
        user = session.get(models.UserDB, identifier)
        if (
            campaign is None
            or user is None
            or not any(g.id == campaign.group_id for g in user.groups)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not eligible to respond",
            )

    db_response = session.get(
        models.ResponseDB,
        (
            event_id,
            identifier,
        ),
    )

    if db_response:
        db_response.value = response.value
    else:
        db_response = models.ResponseDB(
            event_id=event_id,
            user_id=identifier,
            date=datetime.now(),
            **response.model_dump(),
        )
        session.add(db_response)

    session.commit()

    return db_response


class Res(BaseModel):
    event: schemas.Event
    user: schemas.MyProfileUpdate
    response: Optional[schemas.Response] = None


@responses_router.get(
    "/link/prepare",
    response_model=Res,
)
async def get_response_by_token(
    session: SessionDep,
    token_payload: Annotated[
        dict, Depends(ActionTokenAuthorization(ActionTokenValue.CreateResponseByToken))
    ],
):
    db_event = session.get(models.EventDB, token_payload["event_id"])
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    db_user = session.get(models.UserDB, token_payload["user_id"])
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    db_response = session.get(
        models.ResponseDB,
        (
            token_payload["event_id"],
            token_payload["user_id"],
        ),
    )

    return {"event": db_event, "user": db_user, "response": db_response}


@responses_router.put(
    "/link/save",
    response_model=schemas.Response,
)
async def create_response_by_token(
    session: SessionDep,
    response: schemas.ResponseCreate,
    token_payload: Annotated[
        dict, Depends(ActionTokenAuthorization(ActionTokenValue.CreateResponseByToken))
    ],
):
    db_object = models.ResponseDB(
        event_id=token_payload["event_id"],
        user_id=token_payload["user_id"],
        date=datetime.now(),
        **response.model_dump(),
    )
    session.merge(db_object)
    session.commit()
    return db_object


router = APIRouter()
router.include_router(events_router)
router.include_router(responses_router)
