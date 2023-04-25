from fastapi import APIRouter

from bbe2.api.v1.endpoints import albums, events, files, profiles

api_router = APIRouter()
api_router.include_router(profiles.router, tags=["users"])
api_router.include_router(events.router, tags=["events"])
api_router.include_router(albums.router, tags=["Photos"])
api_router.include_router(files.router, tags=["Files"])
