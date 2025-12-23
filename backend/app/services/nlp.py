import spacy
from deep_translator import GoogleTranslator
from typing import List, Dict, Any
import re

# Load simplified English model.
# In a real environment, we'd ensure 'en_core_web_sm' is downloaded.
# For MVP, we might need to rely on simple regex if downloading models is an issue,
# but avoiding ML models was a constraint? No, constraint was "No OWN ML models". Spacy is fine.
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None

class NLPService:
    def __init__(self):
        self.translator = GoogleTranslator(source='en', target='ru')

    def parse_lrc(self, lrc_content: str) -> List[Dict[str, Any]]:
        """
        Parses LRC content into a list of lines with timestamps.
        Format: [{"time": 12.5, "text": "Hello world", "tokens": [...]}]
        """
        lines = []
        # Regex for [mm:ss.xx]Text
        pattern = re.compile(r'\[(\d{2}):(\d{2})[:\.](\d{2,3})\](.*)')
        
        for line in lrc_content.split('\n'):
            match = pattern.match(line)
            if match:
                minutes, seconds, centiseconds, text = match.groups()
                # Normalize centiseconds to milliseconds
                if len(centiseconds) == 2:
                    ms_part = int(centiseconds) * 10
                else:
                    ms_part = int(centiseconds)
                
                total_seconds = int(minutes) * 60 + int(seconds) + ms_part / 1000.0
                text = text.strip()
                
                if text:
                    lines.append({
                        "time": total_seconds,
                        "text": text
                    })
        return lines

    def tokenize_and_translate(self, text: str) -> List[Dict[str, Any]]:
        """
        Tokenizes text. Fallback to simple split if Spacy is missing.
        """
        tokens = []
        if nlp:
            doc = nlp(text)
            for token in doc:
                if not token.is_punct and not token.is_space:
                    tokens.append({
                        "text": token.text,
                        "lemma": token.lemma_,
                        "pos": token.pos_,
                    })
        else:
            # Simple fallback
            for word in text.split():
                clean_word = re.sub(r'[^\w]', '', word)
                if clean_word:
                    tokens.append({
                        "text": clean_word,
                        "lemma": clean_word.lower(),
                        "pos": "UNKNOWN",
                    })
        return tokens

    def translate_text(self, text: str) -> str:
        try:
            if not text or not text.strip():
                return ""
            return self.translator.translate(text)
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    def translate_batch(self, texts: List[str]) -> List[str]:
        """
        Translates a list of strings by joining them to reduce API calls.
        Handles Google's ~5000 character limit.
        """
        if not texts:
            return []
        
        results = []
        batch = []
        current_len = 0
        separator = "\n ||| \n"
        
        for text in texts:
            # If batch would exceed limit, process current batch
            if current_len + len(text) + len(separator) > 4500:
                results.extend(self._process_batch(batch, separator))
                batch = []
                current_len = 0
            
            batch.append(text)
            current_len += len(text) + len(separator)
            
        if batch:
            results.extend(self._process_batch(batch, separator))
            
        return results

    def _process_batch(self, batch: List[str], separator: str) -> List[str]:
        if not batch:
            return []
        joined = separator.join(batch)
        try:
            translated = self.translator.translate(joined)
            # Need to be careful with separator splitting
            # Sometimes translators mess up separators. We strip and split.
            parts = translated.split("|||")
            # If length mismatch, return originals for this batch
            if len(parts) != len(batch):
                print(f"Batch translation length mismatch: {len(parts)} vs {len(batch)}")
                return batch
            return [p.strip() for p in parts]
        except Exception as e:
            print(f"Batch process error: {e}")
            return batch

nlp_service = NLPService()
