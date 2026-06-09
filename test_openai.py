import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(".env")
api_key = os.getenv("OPENAI_API_KEY")
print("API Key starts with:", api_key[:10] if api_key else "None")

try:
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say hello"}],
        max_tokens=10
    )
    print("Success:", response.choices[0].message.content)
except Exception as e:
    print("Error:", type(e).__name__, str(e))
