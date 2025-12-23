from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any, Optional
from app.api import deps
from app.models import User, Track, UserWord, Exercise
from app.services.lrc import lrc_service
from app.services.nlp import nlp_service
from pydantic import BaseModel
import shutil
import os

router = APIRouter()

class TrackSearch(BaseModel):
    id: int
    name: str
    artistName: str
    duration: float

class TrackDetail(BaseModel):
    id: int
    artist_name: str
    track_name: str
    lyrics: List[Any]
    audio_url: Optional[str] = None

def _map_track_to_response(track: Track) -> dict:
    return {
        "id": track.id,
        "artist_name": track.artist_name,
        "track_name": track.track_name,
        "lyrics": track.lyrics_blob,
        "audio_url": f"http://localhost:8000/uploads/{track.audio_url}" if track.audio_url else None
    }

@router.get("/search", response_model=List[TrackSearch])
async def search_tracks(q: str):
    results = await lrc_service.search_track(q)
    return [r for r in results if r.get("syncedLyrics")]

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

    print(f"Imported track with {len(parsed_lines)} lines.")

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

@router.get("/{track_id}", response_model=TrackDetail)
async def get_track(track_id: int, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalars().first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    return _map_track_to_response(track)
