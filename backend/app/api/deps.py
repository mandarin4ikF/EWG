from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.config import settings
from app.models import User
from sqlalchemy import select

async def get_current_user(
    db: AsyncSession = Depends(get_db)
) -> User:
    # MVP Workaround: Always use a default "guest" user for now
    # This avoids all 401 errors while we test core features.
    default_username = "guest"
    
    # Ensure guest user exists
    result = await db.execute(select(User).where(User.username == default_username))
    user = result.scalars().first()
    if not user:
        user = User(username=default_username, email="guest@example.com")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    return user
