from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path

app = FastAPI(title="DOD Performance", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent.parent

# Serve assets directory and root site files
app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")

@app.get("/style.20260304.4.css")
async def style_css():
    return FileResponse(BASE_DIR / "style.20260304.4.css")

@app.get("/script.js")
async def script_js():
    return FileResponse(BASE_DIR / "script.js")

app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="site")
