import os
import json
import google.generativeai as genai
from typing import List, Dict, Any
from ..core.config import settings

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

async def validate_batch_with_ai(values: List[Any], prompt: str) -> Dict[str, bool]:
    # Deduplicate
    unique_values = list(set([str(v) for v in values if v not in [None, ""]]))
    if not unique_values:
        return {}
        
    system_prompt = """You are a strict data validation engine. 
    User will provide a list of values and a validation condition.
    You must evaluate EACH value against the condition.
    Return a JSON object: {"results": [{"value": "val", "isValid": true}, ...]}
    """
    
    user_message = f"""
    Validation Condition: "{prompt}"
    Values: {json.dumps(unique_values)}
    """
    
    try:
        # Prefer Gemini if available acting as our primary
        if settings.GEMINI_API_KEY:
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(
                f"{system_prompt}\n{user_message}", 
                generation_config={"response_mime_type": "application/json"}
            )
            content = response.text
        else:
            # Fallback or OpenAI implementation
            # For brevity in this file I'll stick to Gemini or dummy
            print("No AI Key configured")
            return {v: False for v in unique_values}
            
        result = json.loads(content)
        
        # Parse to Dict
        validation_map = {}
        for item in result.get("results", []):
            validation_map[item["value"]] = item["isValid"]
            
        return validation_map

    except Exception as e:
        print(f"AI Error: {e}")
        return {}
