from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


PACKAGE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PACKAGE_DIR.parent
BASE_DIR = BACKEND_DIR.parent
FRONTEND_DIR = BASE_DIR / "frontend"
SHARED_DIR = BASE_DIR / "shared"
PROFILE_PATH = SHARED_DIR / "simulation-profile.json"


@lru_cache(maxsize=1)
def load_profile() -> dict[str, Any]:
    return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


def default_config_payload() -> dict[str, Any]:
    profile = load_profile()
    return dict(profile.get("defaults", {}))

