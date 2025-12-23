from datetime import datetime, timedelta

class SRSService:
    @staticmethod
    def calculate_next_review(quality: int, interval: int, ease_factor: int, review_count: int):
        """
        Implementation of SM-2 algorithm.
        quality: 0 (forgot), 1 (hard), 2 (good), 3 (easy)
        interval: current interval in days
        ease_factor: current ease factor (as int, e.g. 250 for 2.5)
        review_count: how many times reviewed
        Returns: (new_interval, new_ease_factor, next_review_at)
        """
        # Quality mapping: 
        # 0: Again (Forgot)
        # 1: Hard
        # 2: Good
        # 3: Easy
        
        if quality >= 2: # Success
            if review_count == 0:
                new_interval = 1
            elif review_count == 1:
                new_interval = 6
            else:
                new_interval = round(interval * (ease_factor / 100.0))
            
            # Update ease factor
            # Original formula: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
            # Simplified for our 0-3 scale:
            # We map 0-3 to 2-5 for the original q parameter if needed, 
            # or just use a simplified delta.
            if quality == 3: # Easy
                new_ease_factor = ease_factor + 15
            elif quality == 2: # Good
                new_ease_factor = ease_factor
            else: # Hard (quality 1)
                new_ease_factor = max(130, ease_factor - 20)
                
            new_review_count = review_count + 1
        else: # Fail
            new_interval = 0
            new_ease_factor = ease_factor
            new_review_count = 0 # Reset streak
            
        next_review_at = datetime.now() + timedelta(days=new_interval)
        return new_interval, new_ease_factor, next_review_at

srs_service = SRSService()
