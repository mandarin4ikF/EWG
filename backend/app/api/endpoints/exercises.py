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

@router.get("/generate", response_model=List[ExerciseResponse])
async def generate_exercises(
    count: int = 5,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Generate simple flashcard/multiple choice exercises from user's dictionary.
    """
    # Get words due for review or just random words
    # Simplified logic: Get random 5 words
    result = await db.execute(
        select(UserWord)
        .where(UserWord.user_id == current_user.id)
        .order_by(func.random())
        .limit(count)
    )
    words = result.scalars().all()
    
    if not words:
        return []

    exercises = []
    
    # Get some distractors (all words)
    all_words_res = await db.execute(select(UserWord.translation).where(UserWord.user_id == current_user.id))
    all_translations = all_words_res.scalars().all()

    for word in words:
        # Create a multiple choice question: "Translate [Word]"
        
        # Select 3 distractors
        distractors = [w for w in all_translations if w != word.translation]
        if len(distractors) < 3:
            # Fallback if not enough words
            current_options = distractors + ["Love", "Peace", "Music"][:3-len(distractors)]
            # Verify we didn't accidentally add correct answer
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
