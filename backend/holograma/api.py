from __future__ import annotations

import json
from typing import Annotated, Dict, Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR, SHARED_DIR, default_config_payload, load_profile
from .gestures import GestureHub
from .schemas import (
    BeamControlSchema,
    ConfigureRequestSchema,
    ControlResponseSchema,
    GestureEnvelopeSchema,
    LearningEventSchema,
    SceneName,
    SimulationConfigSchema,
    StepRequestSchema,
    TopologyResponseSchema,
)
from .services import SimulationSession, build_connectome_topology, build_sphere_topology


session = SimulationSession()
gesture_hub = GestureHub()

app = FastAPI(title="DOD Holograma API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/profile")
def profile() -> dict:
    return load_profile()


@app.get("/api/gestures/state")
def gesture_state() -> dict:
    return gesture_hub.export_latest()


@app.post("/api/gestures/event")
async def publish_gesture(payload: GestureEnvelopeSchema) -> dict[str, object]:
    await gesture_hub.publish(payload)
    return {"ok": True, "gesture": payload}


@app.websocket("/ws/gestures")
async def gestures_socket(websocket: WebSocket) -> None:
    await gesture_hub.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            try:
                payload = GestureEnvelopeSchema(**json.loads(message))
            except Exception:
                continue
            await gesture_hub.publish(payload)
    except WebSocketDisconnect:
        await gesture_hub.disconnect(websocket)
    except Exception:
        await gesture_hub.disconnect(websocket)


@app.get("/api/topology/sphere", response_model=TopologyResponseSchema)
def topology_sphere(
    nodeCount: Annotated[Optional[int], Query(ge=32, le=4000)] = None,
    radius: Annotated[Optional[float], Query(ge=1.0, le=20.0)] = None,
) -> TopologyResponseSchema:
    payload = default_config_payload()
    if nodeCount is not None:
        payload["nodeCount"] = nodeCount
    if radius is not None:
        payload["radius"] = radius
    config = SimulationConfigSchema(**payload)
    return TopologyResponseSchema(**build_sphere_topology(config))


@app.get("/api/topology/connectome", response_model=TopologyResponseSchema)
def topology_connectome(
    nodeCount: Annotated[Optional[int], Query(ge=32, le=4000)] = None,
    synapseDensity: Annotated[Optional[float], Query(ge=0.05, le=1.0)] = None,
    connectionDistance: Annotated[Optional[float], Query(ge=0.2, le=12.0)] = None,
) -> TopologyResponseSchema:
    payload = default_config_payload()
    if nodeCount is not None:
        payload["nodeCount"] = nodeCount
    if synapseDensity is not None:
        payload["synapseDensity"] = synapseDensity
    if connectionDistance is not None:
        payload["connectionDistance"] = connectionDistance
    config = SimulationConfigSchema(**payload)
    return TopologyResponseSchema(**build_connectome_topology(config))


@app.get("/api/sphere", response_model=TopologyResponseSchema)
def sphere_compat() -> TopologyResponseSchema:
    return TopologyResponseSchema(**session.topology_for_scene("sphere"))


@app.get("/api/pulse-network", response_model=TopologyResponseSchema)
def pulse_network_compat() -> TopologyResponseSchema:
    return TopologyResponseSchema(**session.topology_for_scene("pulses"))


@app.get("/api/xor")
def xor_compat() -> Dict[str, object]:
    return session.run_xor_steps(steps=8)


@app.post("/api/simulation/start", response_model=ControlResponseSchema)
def start() -> ControlResponseSchema:
    return session.start()


@app.post("/api/simulation/pause", response_model=ControlResponseSchema)
def pause() -> ControlResponseSchema:
    return session.pause()


@app.post("/api/simulation/reset", response_model=ControlResponseSchema)
def reset() -> ControlResponseSchema:
    session.reset()
    return ControlResponseSchema(action="reset", state=session.export_state())


@app.post("/api/simulation/step", response_model=ControlResponseSchema)
def step(payload: StepRequestSchema) -> ControlResponseSchema:
    return session.step_once(payload)


@app.post("/api/simulation/configure", response_model=ControlResponseSchema)
def configure(payload: ConfigureRequestSchema) -> ControlResponseSchema:
    return session.configure(payload)


@app.post("/api/simulation/input-beam", response_model=ControlResponseSchema)
def input_beam(payload: BeamControlSchema) -> ControlResponseSchema:
    return session.inject_beam("object", payload)


@app.post("/api/simulation/reference-beam", response_model=ControlResponseSchema)
def reference_beam(payload: BeamControlSchema) -> ControlResponseSchema:
    return session.inject_beam("reference", payload)


@app.post("/api/simulation/learning-event", response_model=ControlResponseSchema)
def learning_event(payload: LearningEventSchema) -> ControlResponseSchema:
    return session.trigger_learning(payload)


@app.get("/api/simulation/export")
def export_state() -> dict:
    return session.export_payload()


@app.get("/api/simulation/metrics")
def metrics_stream(samples: Annotated[int, Query(ge=1, le=120)] = 12) -> StreamingResponse:
    return StreamingResponse(session.stream_metrics(samples=samples), media_type="text/event-stream")


@app.post("/api/simulation/scene/{scene_name}", response_model=ControlResponseSchema)
def change_scene(scene_name: SceneName) -> ControlResponseSchema:
    return session.configure(ConfigureRequestSchema(scene=scene_name))


app.mount("/shared", StaticFiles(directory=SHARED_DIR), name="shared")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
