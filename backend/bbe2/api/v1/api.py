from fastapi import APIRouter

from bbe2.api.v1.endpoints import albums, auth, events, files, profiles

api_router = APIRouter()
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(profiles.router, tags=["Profiles"])
api_router.include_router(events.router, tags=["Events"])
api_router.include_router(albums.router, tags=["Photos"])
api_router.include_router(files.router, tags=["Files"])
