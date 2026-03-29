from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse, RedirectResponse

app = FastAPI(title="DOD Performance", version="0.1.0")

APP_DIR = Path(__file__).resolve().parent
# Single source of truth for frontend assets and entrypoint.
PUBLIC_DIR = APP_DIR.parent
ASSETS_DIR = PUBLIC_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


def serve_public_file(name: str) -> FileResponse:
    target = PUBLIC_DIR / name
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return FileResponse(target)


@app.get("/")
async def root(request: Request):
    if request.url.query:
        return serve_public_file("index.html")
    return RedirectResponse(
        url="/?scene=sphere&mode=pure&gestures=ws&map=anatomical",
        status_code=307,
    )


@app.get("/style.20260304.4.css")
async def style_css():
    return serve_public_file("style.20260304.4.css")


@app.get("/script.20260304.4.js")
async def script_versioned_js():
    return serve_public_file("script.js")


@app.get("/script.js")
async def script_js():
    return serve_public_file("script.js")


@app.get("/neuro-page.css")
async def neuro_page_css():
    return serve_public_file("neuro-page.css")


@app.get("/neuro-page.js")
async def neuro_page_js():
    return serve_public_file("neuro-page.js")


@app.get("/sport-physio.css")
async def sport_physio_css():
    return serve_public_file("sport-physio.css")


@app.get("/sport-physio.js")
async def sport_physio_js():
    return serve_public_file("sport-physio.js")


@app.get("/physio-page.css")
async def physio_page_css():
    return serve_public_file("physio-page.css")


@app.get("/physio-page.js")
async def physio_page_js():
    return serve_public_file("physio-page.js")


@app.get("/health-page.css")
async def health_page_css():
    return serve_public_file("health-page.css")


@app.get("/health-page.js")
async def health_page_js():
    return serve_public_file("health-page.js")


@app.get("/editorial/trilhas.json")
async def editorial_tracks():
    return serve_public_file("content/editorial/trilhas.json")


@app.get("/editorial/template-artigo.md")
async def editorial_template():
    return serve_public_file("content/editorial/template-artigo.md")


@app.get("/editorial/calendario-12-semanas.md")
async def editorial_calendar():
    return serve_public_file("docs/calendario-editorial-12-semanas.md")


@app.get("/editorial/playbook.md")
async def editorial_playbook():
    return serve_public_file("docs/playbook-editorial-dod.md")


@app.get("/{slug}")
async def spa_routes(slug: str):
    if slug in {"neuro", "neuro-focus"}:
        return serve_public_file("neuro.html")
    if slug in {"sport", "sport-physio"}:
        return serve_public_file("sport.html")
    if slug in {"physio", "physio-core"}:
        return serve_public_file("physio.html")
    if slug in {"health", "homeo", "health-homeostasis"}:
        return serve_public_file("health.html")
    raise HTTPException(status_code=404, detail="Not found")
