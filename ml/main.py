import uvicorn
from fastapi import FastAPI
from routers import ml, rag
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the parent directory (root of the project)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Seller Copilot ML API", version="1.0.0")

app.include_router(ml.router)
app.include_router(rag.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "fastapi"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
