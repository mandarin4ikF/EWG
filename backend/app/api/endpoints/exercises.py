from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Any
import random
from app.api import deps
from app.models import User, UserWord, Exercise
from pydantic import BaseModel

router = APIRouter()

class ExerciseResponse(BaseModel):
    id: int # Exercise ID (optional reference) or just ephemeral
    type: str
    question: str
    options: List[str]
    correct_answer: str

from app.services.srs import srs_service
from datetime import datetime

class ReviewResult(BaseModel):
    word_id: int
    quality: int # 0-3 (0: Forgot, 1: Hard, 2: Good, 3: Easy)

@router.get("/generate", response_model=List[ExerciseResponse])
async def generate_exercises(
    count: int = 5,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Generate exercises from user's dictionary. 
    Prioritize words that are due for review.
    """
    # 1. Get words due for review
    now = datetime.now()
    result = await db.execute(
        select(UserWord)
        .where(UserWord.user_id == current_user.id)
        .where(UserWord.next_review_at <= now)
        .order_by(UserWord.next_review_at.asc())
        .limit(count)
    )
    due_words = result.scalars().all()
    
    # 2. If not enough due words, fill with random new words
    words = list(due_words)
    if len(words) < count:
        remaining = count - len(words)
        result = await db.execute(
            select(UserWord)
            .where(UserWord.user_id == current_user.id)
            .where(UserWord.id.not_in([w.id for w in words]))
            .order_by(func.random())
            .limit(remaining)
        )
        extra_words = result.scalars().all()
        words.extend(extra_words)
    
    if not words:
        return []

    exercises = []
    
    # Get distractors
    all_words_res = await db.execute(select(UserWord.translation).where(UserWord.user_id == current_user.id))
    all_translations = all_words_res.scalars().all()

    for word in words:
        distractors = [w for w in all_translations if w != word.translation]
        if len(distractors) < 3:
            current_options = distractors + ["Love", "Peace", "Music"][:3-len(distractors)]
            current_options = [o for o in current_options if o != word.translation]
        else:
            current_options = random.sample(distractors, 3)
            
        options = current_options + [word.translation]
        random.shuffle(options)
        
        exercises.append({
            "id": word.id,
            "type": "multiple_choice",
            "question": f"Translate: {word.word}",
            "options": options,
            "correct_answer": word.translation
        })

    return exercises

@router.post("/review")
async def review_word(
    review: ReviewResult,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Update SRS stats for a word after a review exercise.
    """
    result = await db.execute(
        select(UserWord).where(
            UserWord.id == review.word_id,
            UserWord.user_id == current_user.id
        )
    )
    word = result.scalars().first()
    if not word:
        return {"status": "error", "message": "Word not found"}
    
    new_interval, new_ease_factor, next_review_at = srs_service.calculate_next_review(
        quality=review.quality,
        interval=word.interval,
        ease_factor=word.ease_factor,
        review_count=word.review_count
    )
    
    word.interval = new_interval
    word.ease_factor = new_ease_factor
    word.next_review_at = next_review_at
    word.review_count = word.review_count + 1 if review.quality >= 2 else 0
    
    await db.commit()
    
    # Update mastery history for dashboard
    from app.services.stats import stats_service
    await stats_service.update_mastery_snapshot(current_user.id, db)

    return {
        "status": "success",
        "next_review": next_review_at.isoformat(),
        "interval": new_interval
    }
