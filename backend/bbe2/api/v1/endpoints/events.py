from datetime import datetime

from bbe2 import models, schemas
from bbe2.crud import CRUDEvent, CRUDResponse
from bbe2.dependencies.auth import get_current_user
from bbe2.utils.scopes import EventScopes
from fastapi import APIRouter, Depends, HTTPException, Security, status

events_router = APIRouter(prefix="/events")
responses_router = APIRouter(prefix="/responses")

### Events


@events_router.get("/", response_model=list[schemas.Event])
async def list_events(
    # token: str = Security(get_current_user, scopes=[EventScopes.VIEW.value]),
    event_crud: CRUDEvent = Depends(CRUDEvent),
):
    return event_crud.find_all()


@events_router.get("/{event_id}", response_model=schemas.Event)
async def get_event(
    event_id: str,
    token: str = Security(get_current_user, scopes=[EventScopes.VIEW]),
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
    # token: str = Security(get_current_user, scopes=[EventScopes.CREATE]),
    event_crud: CRUDEvent = Depends(CRUDEvent),
):
    return event_crud.create(**event.dict())


@events_router.put("/{event_id}", response_model=schemas.Event)
async def update_event(
    event_id: str,
    event: schemas.EventCreate,
    token: str = Security(get_current_user, scopes=[EventScopes.UPDATE]),
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


@responses_router.get("/", response_model=list[schemas.Response])
async def list_responses(
    token: str = Security(get_current_user, scopes=[EventScopes.VIEW]),
    response_crud: CRUDResponse = Depends(CRUDResponse),
):
    return response_crud.find_all()


@events_router.post("/{event_id}/responses", response_model=schemas.Response)
async def create_response(
    event_id: str,
    response: schemas.ResponseCreate,
    token: str = Security(get_current_user, scopes=[EventScopes.VIEW]),
    response_crud: CRUDResponse = Depends(CRUDResponse),
    event_crud: CRUDEvent = Depends(CRUDEvent),
):
    db_event = event_crud.find_one_by(models.Event.id == event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    return response_crud.create(
        value=response.value,
        date=datetime.now(),
        user_id=token,
        event_id=event_id,
    )


router = APIRouter()
router.include_router(events_router)
router.include_router(responses_router)
