from typing import Annotated

from fastapi import APIRouter, Depends, Query

from bbe2 import schemas
from bbe2.dependencies import get_s3_helper
from bbe2.services.search import SearchServiceDep
from bbe2.utils.auth import AuthContext, credentials

router = APIRouter(prefix="/search")

MAX_RESULTS_PER_KIND = 20


@router.get(
    "/",
    dependencies=[Depends(get_s3_helper)],
    response_model=schemas.SearchResults,
)
async def search(
    search_service: SearchServiceDep,
    auth: Annotated[AuthContext, Depends(credentials)],
    q: Annotated[str, Query(max_length=100)],
    limit: Annotated[int, Query(ge=1, le=MAX_RESULTS_PER_KIND)] = 8,
):
    """Search events, members and files by name. Each kind is only searched
    when the caller may view that resource."""
    return search_service.search(q, auth, limit)
