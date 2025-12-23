from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Dict, Any
from app.api import deps
from app.models import User, UserWord, MasteryHistory
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/vocabulary-growth")
async def get_vocabulary_growth(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Returns time-series data of total words learned.
    Format: [{"date": "YYYY-MM-DD", "count": 10}, ...]
    """
    # Query the history table
    result = await db.execute(
        select(MasteryHistory)
        .where(MasteryHistory.user_id == current_user.id)
        .order_by(MasteryHistory.date.asc())
    )
    history = result.scalars().all()
    
    return [{"date": h.date.strftime("%Y-%m-%d"), "count": h.mastered_count} for h in history]

@router.get("/mastery-stats")
async def get_mastery_stats(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Current distribution of word mastery levels.
    """
    result = await db.execute(
        select(UserWord.review_count)
        .where(UserWord.user_id == current_user.id)
    )
    counts = result.scalars().all()
    
    distribution = {
        "New (0)": 0,
        "Learning (1-3)": 0,
        "Mastering (4-7)": 0,
        "Fluent (8+)": 0
    }
    
    for c in counts:
        if c == 0: distribution["New (0)"] += 1
        elif c <= 3: distribution["Learning (1-3)"] += 1
        elif c <= 7: distribution["Mastering (4-7)"] += 1
        else: distribution["Fluent (8+)"] += 1
        
    return [{"level": k, "value": v} for k, v in distribution.items()]
