from __future__ import annotations

import json
import math
import sys
import threading
import time
from typing import Dict, Iterator, List, Sequence

import numpy as np

from .config import BASE_DIR, default_config_payload
from .schemas import (
    BeamControlSchema,
    ConfigureRequestSchema,
    ControlResponseSchema,
    LearningEventSchema,
    MetricsSchema,
    SimulationConfigSchema,
    SimulationStateSchema,
    StepRequestSchema,
)


PROTOTYPE_DIR = BASE_DIR / "future-engines" / "python-prototype"
if str(PROTOTYPE_DIR) not in sys.path:
    sys.path.insert(0, str(PROTOTYPE_DIR))

from holograma_proto import HolographicBrainPrototype  # noqa: E402
from holograma_proto.models import SimulationConfig as PrototypeConfig  # noqa: E402


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def fibonacci_sphere(node_count: int, radius: float) -> List[List[float]]:
    points: List[List[float]] = []
    golden_angle = math.pi * (3 - math.sqrt(5))

    for index in range(node_count):
        t = index / max(node_count - 1, 1)
        y = 1 - t * 2
        radial = math.sqrt(max(0.0, 1 - y * y))
        theta = golden_angle * index
        x = math.cos(theta) * radial
        z = math.sin(theta) * radial
        points.append([x * radius, y * radius, z * radius])

    return points


def build_sphere_topology(config: SimulationConfigSchema) -> Dict[str, object]:
    nodes = fibonacci_sphere(config.nodeCount, config.radius)
    edges: List[List[int]] = []
    lon_lines = config.lonLines
    lat_lines = config.latLines

    shell_nodes = []
    for i in range(lat_lines):
        lat = math.pi * (-0.5 + i / max(lat_lines - 1, 1))
        for j in range(lon_lines):
            lon = 2 * math.pi * (j / lon_lines)
            shell_nodes.append(
                [
                    config.radius * math.cos(lat) * math.cos(lon),
                    config.radius * math.sin(lat),
                    config.radius * math.cos(lat) * math.sin(lon),
                ]
            )

    nodes.extend(shell_nodes)
    offset = config.nodeCount

    for i in range(lat_lines):
        for j in range(lon_lines):
            p1 = offset + i * lon_lines + j
            p2 = offset + i * lon_lines + ((j + 1) % lon_lines)
            edges.append([p1, p2])
            if i < lat_lines - 1:
                edges.append([p1, offset + (i + 1) * lon_lines + j])

    for idx in range(config.nodeCount):
        neighbor = (idx + 7) % config.nodeCount
        edges.append([idx, neighbor])
        if idx + 13 < config.nodeCount:
            edges.append([idx, idx + 13])

    return {"nodes": nodes, "edges": edges, "radius": config.radius}


def build_connectome_topology(config: SimulationConfigSchema, seed: int = 42) -> Dict[str, object]:
    rng = np.random.default_rng(seed)
    points = np.array(fibonacci_sphere(config.nodeCount, config.radius), dtype=np.float64)
    edges: List[List[int]] = []
    max_neighbors = max(3, int(4 + config.synapseDensity * 6))

    for index in range(config.nodeCount):
        delta = points - points[index]
        distances = np.sqrt(np.sum(delta * delta, axis=1))
        neighbor_ids = np.argsort(distances)[1 : max_neighbors + 2]
        for neighbor in neighbor_ids.tolist():
            if neighbor <= index:
                continue
            if distances[neighbor] <= config.connectionDistance * 1.5 and float(rng.random()) <= config.synapseDensity:
                edges.append([index, neighbor])

    if not edges:
        edges.append([0, 1])

    return {"nodes": points.tolist(), "edges": edges, "radius": config.radius}


def schema_to_prototype_config(config: SimulationConfigSchema) -> PrototypeConfig:
    return PrototypeConfig(
        node_count=config.nodeCount,
        synapse_density=config.synapseDensity,
        learning_rate=config.learningRate,
        decay_rate=config.decayRate,
        pruning_rate=config.pruningRate,
        wave_speed=config.waveSpeed,
        beam_object_intensity=config.beamIntensity.object,
        beam_reference_intensity=config.beamIntensity.reference,
        memory_threshold=config.memoryThreshold,
        synchronization_gain=config.synchronizationGain,
        cluster_stability=config.clusterStability,
        camera_mode=config.cameraMode,
        render_quality=config.renderQuality,
        radius=config.radius,
        lat_lines=config.latLines,
        lon_lines=config.lonLines,
        connection_distance=config.connectionDistance,
    )


class SimulationSession:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._default_config = SimulationConfigSchema(**default_config_payload())
        self.config = SimulationConfigSchema(**self._default_config.model_dump())
        self.scene = "sphere"
        self.source_mode = "api"
        self._engine = self._build_engine(self.config)
        self._engine.pause()
        self._sync_engine_state()

    def reset(self) -> SimulationStateSchema:
        with self._lock:
            self.config = SimulationConfigSchema(**self._default_config.model_dump())
            self.scene = "sphere"
            self.source_mode = "api"
            self._engine = self._build_engine(self.config)
            self._engine.pause()
            self._sync_engine_state()
            return self._state()

    def start(self) -> ControlResponseSchema:
        with self._lock:
            self._engine.start()
            self._sync_engine_state()
            return ControlResponseSchema(action="start", state=self._state())

    def pause(self) -> ControlResponseSchema:
        with self._lock:
            self._engine.pause()
            self._sync_engine_state()
            return ControlResponseSchema(action="pause", state=self._state())

    def configure(self, payload: ConfigureRequestSchema) -> ControlResponseSchema:
        with self._lock:
            previous_status = self._engine.status

            if payload.sourceMode is not None:
                self.source_mode = payload.sourceMode

            if payload.config is not None:
                self.config = payload.config
                self._engine = self._build_engine(self.config)
                if previous_status == "running":
                    self._engine.start()
                else:
                    self._engine.pause()

            if payload.scene is not None:
                self.scene = payload.scene

            self._sync_engine_state()
            return ControlResponseSchema(action="configure", state=self._state())

    def step_once(self, payload: StepRequestSchema) -> ControlResponseSchema:
        with self._lock:
            self._sync_engine_state()
            self._engine.step(payload.steps)
            self._sync_engine_state()
            return ControlResponseSchema(action="step", state=self._state())

    def inject_beam(self, name: str, beam: BeamControlSchema) -> ControlResponseSchema:
        with self._lock:
            beam_state = self._engine.beams[name]
            beam_state.enabled = beam.enabled
            beam_state.intensity = beam.intensity
            beam_state.direction = list(beam.direction)
            beam_state.phase_offset = beam.phaseOffset

            if name == "object":
                self.config.beamIntensity.object = beam.intensity
                self._engine.config.beam_object_intensity = beam.intensity
                if beam.enabled and beam.intensity > 0:
                    self._engine.inject_sensory_input(
                        amplitude=beam.intensity,
                        width=max(8, int(self.config.nodeCount * 0.04)),
                    )
                self._engine.system_mode = "processing"
            else:
                self.config.beamIntensity.reference = beam.intensity
                self._engine.config.beam_reference_intensity = beam.intensity
                self._engine.system_mode = "learning"

            return ControlResponseSchema(action=f"{name}-beam", state=self._state())

    def trigger_learning(self, payload: LearningEventSchema) -> ControlResponseSchema:
        with self._lock:
            self._engine.trigger_learning_event(payload.boost)
            self._sync_engine_state()
            return ControlResponseSchema(action="learning", state=self._state())

    def export_state(self) -> SimulationStateSchema:
        with self._lock:
            return self._state()

    def export_payload(self) -> Dict[str, object]:
        with self._lock:
            return self._payload()

    def stream_metrics(self, samples: int = 12, interval_seconds: float = 0.35) -> Iterator[str]:
        for _ in range(samples):
            with self._lock:
                if self._engine.status == "running":
                    self._engine.step(1)
                payload = self._payload()
                metrics = dict(payload["metrics"])
                metrics["status"] = payload["status"]
                metrics["scene"] = payload["scene"]
                metrics["step"] = payload["step"]
                metrics["systemMode"] = payload["systemMode"]
                metrics["predictionText"] = payload["predictionText"]
            yield f"data: {json.dumps(metrics)}\n\n"
            time.sleep(interval_seconds)

    def topology_for_scene(self, scene: str) -> Dict[str, object]:
        with self._lock:
            if scene == "pulses":
                return self._prototype_topology()
            return build_sphere_topology(self.config)

    def xor_snapshot(self) -> Dict[str, object]:
        with self._lock:
            return {
                "loss": self._engine.xor_trainer.loss,
                "steps": self._engine.xor_trainer.steps,
                "prediction": self._engine.prediction_text,
            }

    def run_xor_steps(self, steps: int = 8) -> Dict[str, object]:
        with self._lock:
            self.scene = "xor"
            self._sync_engine_state()
            self._engine.step(steps)
            self._sync_engine_state()
            return {
                "loss": self._engine.xor_trainer.loss,
                "steps": self._engine.xor_trainer.steps,
                "prediction": self._engine.prediction_text,
            }

    def _build_engine(self, config: SimulationConfigSchema) -> HolographicBrainPrototype:
        prototype = HolographicBrainPrototype(config=schema_to_prototype_config(config))
        return prototype

    def _sync_engine_state(self) -> None:
        self._engine.set_scene(self.scene)
        if self.scene == "xor":
            self._engine.system_mode = "learning"
        elif self._engine.status == "paused":
            self._engine.system_mode = "idle"
        else:
            self._engine.system_mode = "processing"

    def _beam_schema(self, name: str) -> BeamControlSchema:
        beam = self._engine.beams[name]
        return BeamControlSchema(
            enabled=beam.enabled,
            intensity=beam.intensity,
            direction=list(beam.direction),
            phaseOffset=beam.phase_offset,
        )

    def _prototype_topology(self) -> Dict[str, object]:
        nodes = [list(node.position) for node in self._engine.nodes]
        edges = [
            [synapse.source, synapse.target]
            for synapse in self._engine.synapses
            if not synapse.pruned
        ]
        if not edges:
            return build_connectome_topology(self.config)
        return {"nodes": nodes, "edges": edges, "radius": self.config.radius}

    def _payload(self) -> Dict[str, object]:
        engine_payload = self._engine.export_state()
        engine_payload["scene"] = self.scene
        engine_payload["sourceMode"] = self.source_mode
        engine_payload["config"] = self.config.model_dump()
        engine_payload["beams"] = {
            "object": self._beam_schema("object").model_dump(),
            "reference": self._beam_schema("reference").model_dump(),
        }
        return engine_payload

    def _state(self) -> SimulationStateSchema:
        payload = self._payload()
        return SimulationStateSchema(
            status=payload["status"],
            scene=payload["scene"],
            sourceMode=payload["sourceMode"],
            step=payload["step"],
            systemMode=payload["systemMode"],
            config=SimulationConfigSchema(**payload["config"]),
            beams={
                "object": BeamControlSchema(**payload["beams"]["object"]),
                "reference": BeamControlSchema(**payload["beams"]["reference"]),
            },
            metrics=MetricsSchema(**payload["metrics"]),
        )
