from fastapi import APIRouter
from app.api.endpoints import tracks, users, exercises

api_router = APIRouter()
api_router.include_router(tracks.router, prefix="/tracks", tags=["tracks"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
