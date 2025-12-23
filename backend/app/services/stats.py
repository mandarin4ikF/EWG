from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models import UserWord, MasteryHistory
from datetime import datetime

class StatsService:
    async def update_mastery_snapshot(self, user_id: int, db: AsyncSession):
        """
        Calculates current mastery count and saves it for today.
        Mastered = words with interval > 0.
        """
        # Count mastered words
        result = await db.execute(
            select(func.count(UserWord.id))
            .where(
                UserWord.user_id == user_id,
                UserWord.interval > 0
            )
        )
        count = result.scalar() or 0
        
        today = datetime.now().date()
        
        # Check if we already have a record for today
        history_result = await db.execute(
            select(MasteryHistory)
            .where(
                MasteryHistory.user_id == user_id,
                func.date(MasteryHistory.date) == today
            )
        )
        existing = history_result.scalars().first()
        
        if existing:
            existing.mastered_count = count
        else:
            new_record = MasteryHistory(
                user_id=user_id,
                mastered_count=count,
                date=datetime.now()
            )
            db.add(new_record)
            
        await db.commit()

stats_service = StatsService()
