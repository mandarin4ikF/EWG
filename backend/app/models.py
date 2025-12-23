from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    words = relationship("UserWord", back_populates="user")
    exercises = relationship("Exercise", back_populates="user")

class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    lrclib_id = Column(Integer, unique=True, index=True)
    artist_name = Column(String, index=True)
    track_name = Column(String, index=True)
    duration = Column(Integer)
    lyrics_blob = Column(JSON) # Stores tokenized lyrics structure
    plain_lyrics = Column(Text) # Fallback / Search
    audio_url = Column(String, nullable=True) # URL to uploaded MP3
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserWord(Base):
    __tablename__ = "user_words"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    word = Column(String, index=True)
    lemma = Column(String, index=True)
    translation = Column(String)
    context_phrase = Column(String, nullable=True)
    
    # Simple SRS fields
    review_count = Column(Integer, default=0)
    next_review_at = Column(DateTime(timezone=True), default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="words")

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String) # 'flashcard', 'fill_blanks'
    content = Column(JSON)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="exercises")
