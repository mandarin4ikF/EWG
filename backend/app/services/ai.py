import httpx
import json
from typing import Dict, Any

class AIService:
    def __init__(self, model: str = "qwen3:0.6b"):
        # Use 127.0.0.1 instead of localhost for better reliability on Windows
        self.url = "http://127.0.0.1:11434/api/generate"
        self.model = model

    async def explain_word(self, word: str, context: str) -> str:
        prompt = f"""
Ты — помощник по изучению английского языка через песни.
Проанализируй английское слово или выражение "{word}", которое используется в следующем фрагменте песни: "{context}"
Дай подробное, но простое объяснение СТРОГО НА РУССКОМ ЯЗЫКЕ.

Структура ответа:
1. Значение в этом контексте
2. Когда и где используется
3. Синонимы
4. Примеры использования
5. Другие значения (если есть)

Правила: ТОЛЬКО на русском, просто, дружелюбно.
"""
        payload = {"model": self.model, "prompt": prompt, "stream": False}
        return await self._call_ollama(payload)

    async def explain_grammar(self, line: str) -> str:
        prompt = f"""
Ты — эксперт по английской грамматике. Проанализируй строку: "{line}"
Объясни грамматику СТРОГО НА РУССКОМ ЯЗЫКЕ.
Особенно: времена (почему именно это время), порядок слов, нюансы.

Структура:
1. Основная конструкция
2. Почему это здесь (логика выбора времени)
3. Порядок слов и нюансы
"""
        payload = {"model": self.model, "prompt": prompt, "stream": False}
        return await self._call_ollama(payload)

    async def generate_story(self, words: list[Dict[str, str]]) -> str:
        words_list = ", ".join([f"{w['word']} ({w['translation']})" for w in words])
        prompt = f"""
Ты — профессиональный преподаватель английского языка. Твоя задача — помочь ученику запомнить слова через полезные жизненные ситуации.
Вот список слов (английское - русский перевод):
{words_list}

Напиши короткий текст (3-5 предложений) СТРОГО НА РУССКОМ ЯЗЫКЕ, описывающий ПРАКТИЧЕСКУЮ ситуацию (например: в аэропорту, в магазине, как пройти к метро, заказ еды).
Внутри русского текста оставь английские слова на английском.

Пример: "Если вы потерялись, спросите: 'How can I get to the metro?'. Это очень useful информация для туриста."

Сделай текст максимально полезным и приближенным к реальной жизни.
"""
        payload = {"model": self.model, "prompt": prompt, "stream": False}
        return await self._call_ollama(payload)

    async def _call_ollama(self, payload: dict) -> str:
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(self.url, json=payload)
                if response.status_code == 404:
                    return f"Ollama error 404: Model {self.model} not found."
                response.raise_for_status()
                data = response.json()
                return data.get("response", "No response from AI.")
        except Exception as e:
            return f"Error: {str(e)}"

ai_service = AIService()
