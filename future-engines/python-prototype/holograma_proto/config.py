from __future__ import annotations

import json
from pathlib import Path

from .models import SimulationConfig


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def profile_path() -> Path:
    return _project_root() / "shared" / "simulation-profile.json"


def load_config_from_profile() -> SimulationConfig:
    payload = json.loads(profile_path().read_text(encoding="utf-8"))
    defaults = payload.get("defaults", {})
    beam = defaults.get("beamIntensity", {})
    return SimulationConfig(
        node_count=int(defaults.get("nodeCount", 180)),
        synapse_density=float(defaults.get("synapseDensity", 0.3)),
        learning_rate=float(defaults.get("learningRate", 0.08)),
        decay_rate=float(defaults.get("decayRate", 0.94)),
        pruning_rate=float(defaults.get("pruningRate", 0.002)),
        wave_speed=float(defaults.get("waveSpeed", 1.15)),
        beam_object_intensity=float(beam.get("object", 1.0)),
        beam_reference_intensity=float(beam.get("reference", 0.72)),
        memory_threshold=float(defaults.get("memoryThreshold", 0.62)),
        synchronization_gain=float(defaults.get("synchronizationGain", 0.18)),
        cluster_stability=float(defaults.get("clusterStability", 0.78)),
        camera_mode=str(defaults.get("cameraMode", "orbital")),
        render_quality=str(defaults.get("renderQuality", "high")),
        radius=float(defaults.get("radius", 5.9)),
        lat_lines=int(defaults.get("latLines", 22)),
        lon_lines=int(defaults.get("lonLines", 30)),
        connection_distance=float(defaults.get("connectionDistance", 2.65)),
    )
