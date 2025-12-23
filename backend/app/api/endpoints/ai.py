from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from app.api import deps
from app.models import User, UserWord
from app.services.ai import ai_service
from pydantic import BaseModel

router = APIRouter()

class GrammarRequest(BaseModel):
    line: str

@router.post("/grammar")
async def explain_grammar(req: GrammarRequest):
    explanation = await ai_service.explain_grammar(req.line)
    return {"explanation": explanation}

@router.post("/story")
async def generate_story(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Generate a story using words that are due for review or recently added.
    """
    # Get 5 words for the story
    result = await db.execute(
        select(UserWord)
        .where(UserWord.user_id == current_user.id)
        .limit(5)
    )
    words = result.scalars().all()
    
    if not words:
        raise HTTPException(status_code=400, detail="No words found in your library to make a story.")
    
    word_data = [{"word": w.word, "translation": w.translation} for w in words]
    story = await ai_service.generate_story(word_data)
    return {"story": story, "words": word_data}
