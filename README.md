# English With Songs (MVP)

Learn English by listening to your favorite songs! This application synchronizes lyrics, allows you to translate words on the click, and generates exercises based on your personal dictionary.

## Features
- **Search & Play**: Find any song (powered by LRCLIB) and play it with synchronized lyrics.
- **Interactive Lyrics**: Click any word to translate it and see it in context.
- **Personal Dictionary**: Save words you want to learn.
- **Exercises**: Auto-generated generated flashcards/quizzes from your saved words.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS, TypeScript.
- **Backend**: FastAPI, PostgreSQL, Redis, SQLAlchemy.
- **External Services**: LRCLIB (Lyrics), Google Translate (via deep-translator).

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis

### Backend
1. Navigate to `backend/`
2. Create virtual environment: `python -m venv venv`
3. Activate: `.\venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Configure `.env` (or update `app/core/config.py` with your DB credentials).
6. Run migrations (or let FastAPI auto-create tables via `models.Base.metadata.create_all` - *Note: This MVP uses auto-create on startup in `database.py` logic if added, or rely on manual Alembic init. For simplcity, ensure DB `ewg_db` exists*).
7. Start server: `python app/main.py` -> Running on `http://localhost:8000`

### Frontend
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Open `http://localhost:5173`

## Usage
1. Enter a song name (e.g., "Yesterday").
2. Select a track.
3. Provide an audio file (since we don't host MP3s due to copyright) or just read along.
4. Click words to translate.
5. Go to "Library" to review words and take quizzes.
