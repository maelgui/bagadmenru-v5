from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy.orm import Session

from bbe2 import models, schemas
from bbe2.crud import CRUDEvent, CRUDResponse
from bbe2.dependencies.auth import get_current_user
from bbe2.dependencies.db import get_db
from bbe2.utils.scopes import EventScopes

events_router = APIRouter(prefix="/events")
responses_router = APIRouter(prefix="/responses")

### Events


@events_router.get("/", response_model=list[schemas.Event])
async def list_events(
    token: str = Security(get_current_user, scopes=[EventScopes.VIEW.value]),
    session: Session = Depends(get_db),
):
    return session.query(models.Event).order_by(models.Event.date).all()


@events_router.get("/{event_id}", response_model=schemas.Event)
async def get_event(
    event_id: str,
    token: str = Security(get_current_user, scopes=[EventScopes.VIEW.value]),
    event_crud: CRUDEvent = Depends(CRUDEvent),
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
    token: str = Security(get_current_user, scopes=[EventScopes.CREATE.value]),
    event_crud: CRUDEvent = Depends(CRUDEvent),
):
    return event_crud.create(**event.dict())


@events_router.put("/{event_id}", response_model=schemas.Event)
async def update_event(
    event_id: str,
    event: schemas.EventCreate,
    token: str = Security(get_current_user, scopes=[EventScopes.UPDATE.value]),
    event_crud: CRUDEvent = Depends(CRUDEvent),
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
    event_id: str,
    token: str = Security(get_current_user, scopes=[EventScopes.DELETE]),
    event_crud: CRUDEvent = Depends(CRUDEvent),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    event_crud.delete(event_id)


## Responses


@responses_router.get("/")
async def list_responses(
    token: str = Security(get_current_user, scopes=[]),
    response_crud: CRUDResponse = Depends(CRUDResponse),
) -> list[schemas.Response]:
    return response_crud.find_all()


@events_router.put("/{event_id}/responses", status_code=status.HTTP_204_NO_CONTENT)
async def create_response(
    event_id: str,
    response: schemas.ResponseCreate,
    token: dict[str, Any] = Security(
        get_current_user, scopes=["manage-own-poll-answers"]
    ),
    db: Session = Depends(get_db),
    event_crud: CRUDEvent = Depends(CRUDEvent),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    db_object = models.Response(
        event_id=event_id, user_id=token["sub"], date=datetime.now(), **response.dict()
    )
    print(response, db_object)
    db.merge(db_object)
    db.commit()
    return db_object


router = APIRouter()
router.include_router(events_router)
router.include_router(responses_router)
