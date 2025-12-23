from fastapi import APIRouter
from app.api.endpoints import tracks, users, exercises, ai, stats

api_router = APIRouter()
api_router.include_router(tracks.router, prefix="/tracks", tags=["tracks"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
