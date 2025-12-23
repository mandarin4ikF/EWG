from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.api import deps
from app.models import User, UserWord
from pydantic import BaseModel

router = APIRouter()

class WordCreate(BaseModel):
    word: str
    translation: str
    context: str

class WordResponse(BaseModel):
    id: int
    word: str
    translation: str
    context_phrase: str

@router.post("/words", response_model=WordResponse)
async def add_word(
    word_in: WordCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    # Check if word already exists for user
    result = await db.execute(
        select(UserWord).where(
            UserWord.user_id == current_user.id, 
            UserWord.word == word_in.word
        )
    )
    existing = result.scalars().first()
    if existing:
        return existing # Or update context?
    
    new_word = UserWord(
        user_id=current_user.id,
        word=word_in.word,
        translation=word_in.translation,
        context_phrase=word_in.context,
        lemma=word_in.word # Simplified for now
    )
    db.add(new_word)
    await db.commit()
    await db.refresh(new_word)
    
    # Update mastery history
    from app.services.stats import stats_service
    await stats_service.update_mastery_snapshot(current_user.id, db)
    
    return new_word

@router.get("/words", response_model=List[WordResponse])
async def get_words(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(UserWord).where(UserWord.user_id == current_user.id))
    words = result.scalars().all()
    return words
@router.delete("/words/{word_id}")
async def delete_word(
    word_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(
        select(UserWord).where(
            UserWord.id == word_id,
            UserWord.user_id == current_user.id
        )
    )
    word = result.scalars().first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    await db.delete(word)
    await db.commit()
    
    # Update mastery history
    from app.services.stats import stats_service
    await stats_service.update_mastery_snapshot(current_user.id, db)
    
    return {"status": "success"}
