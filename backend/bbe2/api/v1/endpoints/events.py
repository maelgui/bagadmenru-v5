from datetime import datetime
from typing import Annotated, Any, Optional

from bbe2.dependencies import SessionDep
from fastapi import APIRouter, Depends, HTTPException, Security, status
from ics import Calendar, Event
from sqlalchemy.orm import Session

from bbe2 import models, schemas
from bbe2.crud import CRUDEvent, CRUDResponse
from bbe2.utils.auth import get_current_user
from bbe2.utils.scopes import EventScopes

events_router = APIRouter(prefix="/events")
responses_router = APIRouter(prefix="/responses")

### Events


@events_router.get("/", response_model=list[schemas.Event])
async def list_events(
    session: SessionDep,
    token: str = Security(get_current_user, scopes=[str(EventScopes.VIEW)]),
    limit: int = 10,
    date__gte: Optional[datetime] = None,
    date__lt: Optional[datetime] = None,
    is_in_doodle: Optional[bool] = None,
    ordering: str = "date",
):
    q = session.query(models.Event)
    if date__gte:
        q = q.filter(models.Event.date >= date__gte)
    if date__lt:
        q = q.filter(models.Event.date < date__lt)
    if is_in_doodle:
        q = q.filter(models.Event.is_in_doodle == is_in_doodle)
    if ordering:
        order = "desc" if ordering.startswith("-") else "asc"
        col = getattr(models.Event, ordering.lstrip("-"))
        order = getattr(col, order)()
        q = q.order_by(order)
    q = q.limit(limit)
    return q.all()


@events_router.get("/export/ics")
async def export_ics(
    session: SessionDep,
    token: str = Security(get_current_user, scopes=[str(EventScopes.VIEW)]),
) -> str:
    events = session.query(models.Event).order_by(models.Event.date).all()
    c = Calendar()
    for event in events:
        e = Event()
        e.name = event.title
        e.begin = event.date
        c.events.add(e)

    return c.serialize()


@events_router.get("/{event_id}", response_model=schemas.Event)
async def get_event(
    event_id: int,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    token: str = Security(get_current_user, scopes=[str(EventScopes.VIEW)]),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    return db_event


@events_router.post(
    "/", response_model=schemas.Event, status_code=status.HTTP_201_CREATED
)
async def create_event(
    event: schemas.EventCreate,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    token: str = Security(get_current_user, scopes=[str(EventScopes.CREATE)]),
):
    return event_crud.create(**event.dict())


@events_router.put("/{event_id}", response_model=schemas.Event)
async def update_event(
    event_id: int,
    event: schemas.EventCreate,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    token: str = Security(get_current_user, scopes=[str(EventScopes.UPDATE)]),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    db_event = event_crud.update(db_event, event)
    return db_event


@events_router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    token: str = Security(get_current_user, scopes=[str(EventScopes.DELETE)]),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    event_crud.delete(event_id)


## Responses


@responses_router.get("/", response_model=list[schemas.Response])
async def list_responses(
    response_crud: Annotated[CRUDResponse, Depends(CRUDResponse)],
    user_id: Optional[str] = None,
    token: str = Security(get_current_user, scopes=[str(EventScopes.ANSWER)]),
):
    if user_id:
        return response_crud.find_by(models.Response.user_id == user_id)
    else:
        return response_crud.find_all()


@events_router.put("/{event_id}/responses", response_model=schemas.Response)
async def create_response(
    event_id: int,
    response: schemas.ResponseCreate,
    session: SessionDep,
    event_crud: Annotated[CRUDEvent, Depends(CRUDEvent)],
    identifier: str = Security(get_current_user, scopes=[str(EventScopes.ANSWER)]),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    db_object = models.Response(
        event_id=event_id, user_id=identifier, date=datetime.now(), **response.dict()
    )
    session.merge(db_object)
    session.commit()
    return db_object


router = APIRouter()
router.include_router(events_router)
router.include_router(responses_router)
