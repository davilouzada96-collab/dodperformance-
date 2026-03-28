from fastapi import FastAPI
from starlette.responses import FileResponse
from pathlib import Path

app = FastAPI(title="DOD Performance", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent.parent

@app.get("/")
async def root():
    return FileResponse(BASE_DIR / "index.html")

@app.get("/style.20260304.4.css")
async def style_css():
    return FileResponse(BASE_DIR / "style.20260304.4.css")

@app.get("/script.js")
async def script_js():
    return FileResponse(BASE_DIR / "script.js")
