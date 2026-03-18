from __future__ import annotations

import asyncio
import json
from typing import Set

from fastapi import WebSocket

from .schemas import GestureEnvelopeSchema


class GestureHub:
    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._latest: GestureEnvelopeSchema | None = None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
            latest = self._latest
        if latest is not None:
            await websocket.send_text(latest.model_dump_json())

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def publish(self, payload: GestureEnvelopeSchema) -> None:
        message = payload.model_dump_json()
        async with self._lock:
            self._latest = payload
            connections = list(self._connections)

        stale = []
        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception:
                stale.append(websocket)

        if stale:
            async with self._lock:
                for websocket in stale:
                    self._connections.discard(websocket)

    def export_latest(self) -> dict[str, object]:
        if self._latest is None:
            return {"connectedClients": len(self._connections), "latest": None}
        return {
            "connectedClients": len(self._connections),
            "latest": json.loads(self._latest.model_dump_json()),
        }
