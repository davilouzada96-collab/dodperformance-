from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

app = FastAPI(title="DOD Performance", version="0.1.0")

APP_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = APP_DIR / "public"
ASSETS_DIR = PUBLIC_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

def serve_public_file(name: str) -> FileResponse:
    target = PUBLIC_DIR / name
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return FileResponse(target)

@app.get("/")
async def root():
    return serve_public_file("index.html")

@app.get("/style.20260304.4.css")
async def style_css():
    return serve_public_file("style.20260304.4.css")

@app.get("/script.20260304.4.js")
async def script_versioned_js():
    return serve_public_file("script.20260304.4.js")

@app.get("/script.js")
async def script_js():
    return serve_public_file("script.js")

@app.get("/{slug}")
async def spa_routes(slug: str):
    if slug in {"neuro", "physio", "sport", "homeo", "health"}:
        return serve_public_file("index.html")
    raise HTTPException(status_code=404, detail="Not found")
