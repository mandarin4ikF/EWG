from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any, Optional
from app.api import deps
from app.models import User, Track, UserWord, Exercise
from app.services.lrc import lrc_service
from app.services.nlp import nlp_service
from app.services.ai import ai_service
from pydantic import BaseModel
import shutil
import os

router = APIRouter()

class TrackSearch(BaseModel):
    id: int
    trackName: str
    artistName: str
    duration: float

class TrackDetail(BaseModel):
    id: int
    artist_name: str
    track_name: str
    lyrics: List[Any]
    duration: float
    audio_url: Optional[str] = None

def _map_track_to_response(track: Track) -> dict:
    return {
        "id": track.id,
        "artist_name": track.artist_name,
        "track_name": track.track_name,
        "lyrics": track.lyrics_blob,
        "duration": track.duration,
        "audio_url": f"http://localhost:8000/uploads/{track.audio_url}" if track.audio_url else None
    }

@router.get("/search", response_model=List[TrackSearch])
async def search_tracks(q: str):
    results = await lrc_service.search_track(q)
    
    seen = set()
    unique_results = []
    
    for r in results:
        if not r.get("syncedLyrics"):
            continue
            
        # Deduplicate by artist and track name (case-insensitive)
        artist = r.get("artistName", "").strip().lower()
        track = r.get("trackName", "").strip().lower()
        key = (artist, track)
        
        if key not in seen:
            seen.add(key)
            unique_results.append({
                "id": r["id"],
                "trackName": r["trackName"],
                "artistName": r["artistName"],
                "duration": r["duration"]
            })
            
    return unique_results

@router.post("/import/{lrclib_id}", response_model=TrackDetail)
async def import_track(
    lrclib_id: int, 
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(Track).where(Track.lrclib_id == lrclib_id))
    existing_track = result.scalars().first()
    if existing_track:
        # If existing but missing translations, we might want to re-parse
        # but for now just return.
        return _map_track_to_response(existing_track)

    data = await lrc_service.get_lyrics(lrclib_id)
    if not data or not data.get("syncedLyrics"):
        raise HTTPException(status_code=404, detail="Track not found")

    parsed_lines = nlp_service.parse_lrc(data["syncedLyrics"])
    
    # Batch translate all lines for performance
    texts_to_translate = [line["text"] for line in parsed_lines]
    translations = nlp_service.translate_batch(texts_to_translate)
    
    for i, line in enumerate(parsed_lines):
        line["translation"] = translations[i] if i < len(translations) else line["text"]
        line["tokens"] = nlp_service.tokenize_and_translate(line["text"])

    print(f"Imported 1 track with {len(parsed_lines)} lines.")

    new_track = Track(
        lrclib_id=lrclib_id,
        artist_name=data["artistName"],
        track_name=data["trackName"],
        duration=data["duration"],
        lyrics_blob=parsed_lines,
        plain_lyrics=data["plainLyrics"]
    )
    db.add(new_track)
    await db.commit()
    await db.refresh(new_track)
    return _map_track_to_response(new_track)

@router.get("/translate/{word}")
async def translate_word(word: str):
    translation = nlp_service.translate_text(word)
    return {"word": word, "translation": translation}

class ExplainRequest(BaseModel):
    word: str
    context: str

@router.post("/explain")
async def explain_word(req: ExplainRequest):
    explanation = await ai_service.explain_word(req.word, req.context)
    return {"explanation": explanation}

@router.post("/{track_id}/audio", response_model=TrackDetail)
async def upload_audio(
    track_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalars().first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"track_{track.id}{file_ext}"
    file_path = os.path.join("uploads", file_name)

    if not os.path.exists("uploads"):
        os.makedirs("uploads")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    track.audio_url = file_name
    await db.commit()
    await db.refresh(track)
    return _map_track_to_response(track)

@router.get("/{track_id}/cloze")
async def get_cloze_lyrics(
    track_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Generate lyrics with blanks for words the user is learning.
    """
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalars().first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Get user's words
    user_words_res = await db.execute(select(UserWord).where(UserWord.user_id == current_user.id))
    user_words = [w.word.lower() for w in user_words_res.scalars().all()]

    if not user_words:
        return {"lyrics": track.lyrics_blob, "message": "No words in dictionary to practice"}

    # Process lyrics to mark words that belong to user's word list
    cloze_lyrics = []
    for line in track.lyrics_blob:
        new_line = {
            "time": line["time"],
            "text": line["text"],
            "translation": line.get("translation"),
            "tokens": []
        }
        
        # Simple word by word matching for cloze
        # In a real app we'd use Spacy tokens, but let's stick to simple split for stability
        words_in_line = line["text"].split()
        for w in words_in_line:
            clean_w = "".join(filter(str.isalnum, w)).lower()
            is_cloze = clean_w in user_words
            new_line["tokens"].append({
                "text": w,
                "is_cloze": is_cloze,
                "clean_text": clean_w if is_cloze else None
            })
        cloze_lyrics.append(new_line)

    return {"lyrics": cloze_lyrics}
