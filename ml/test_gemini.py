"""Quick test — run this to check if the Gemini key works with new SDK."""
from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")
print(f"Key loaded: {api_key[:20]}..." if api_key else "ERROR: No key found in .env!")

try:
    from google import genai
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.0-flash-lite',
        contents='Say hello in one sentence.'
    )
    print("SUCCESS! Gemini response:", response.text.strip())
except Exception as e:
    print(f"FAILED: {e}")
