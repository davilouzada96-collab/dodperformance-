from fastapi import FastAPI
from fastapi.responses import FileResponse
from pathlib import Path

app = FastAPI(title="DOD Performance", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_INDEX = BASE_DIR / "index.html"

@app.get("/")
async def root():
    if STATIC_INDEX.exists():
        return FileResponse(STATIC_INDEX)
    return {"message": "DOD Performance site is available."}
