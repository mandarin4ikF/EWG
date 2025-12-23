import httpx
from typing import Optional, List, Dict, Any

class LRCLibService:
    BASE_URL = "https://lrclib.net/api"

    async def search_track(self, query: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/search", params={"q": query})
            response.raise_for_status()
            return response.json()

    async def get_lyrics(self, track_id: int) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.BASE_URL}/get/{track_id}")
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError:
                return None

lrc_service = LRCLibService()
