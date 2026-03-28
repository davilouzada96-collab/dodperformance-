from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="DOD Performance", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent.parent

# Serve the app files and assets directly from the repository root
app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="site")
