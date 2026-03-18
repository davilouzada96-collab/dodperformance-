from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Dict, List


@dataclass
class BeamState:
    enabled: bool = True
    intensity: float = 1.0
    direction: List[float] = field(default_factory=lambda: [0.0, 1.0, 0.0])
    phase_offset: float = 0.0

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class SimulationConfig:
    node_count: int = 180
    synapse_density: float = 0.3
    learning_rate: float = 0.08
    decay_rate: float = 0.94
    pruning_rate: float = 0.002
    wave_speed: float = 1.15
    beam_object_intensity: float = 1.0
    beam_reference_intensity: float = 0.72
    memory_threshold: float = 0.62
    synchronization_gain: float = 0.18
    cluster_stability: float = 0.78
    camera_mode: str = "orbital"
    render_quality: str = "high"
    radius: float = 5.9
    lat_lines: int = 22
    lon_lines: int = 30
    connection_distance: float = 2.65

    def to_api_dict(self) -> Dict:
        return {
            "nodeCount": self.node_count,
            "synapseDensity": self.synapse_density,
            "learningRate": self.learning_rate,
            "decayRate": self.decay_rate,
            "pruningRate": self.pruning_rate,
            "waveSpeed": self.wave_speed,
            "beamIntensity": {
                "object": self.beam_object_intensity,
                "reference": self.beam_reference_intensity,
            },
            "memoryThreshold": self.memory_threshold,
            "synchronizationGain": self.synchronization_gain,
            "clusterStability": self.cluster_stability,
            "cameraMode": self.camera_mode,
            "renderQuality": self.render_quality,
            "radius": self.radius,
            "latLines": self.lat_lines,
            "lonLines": self.lon_lines,
            "connectionDistance": self.connection_distance,
        }


@dataclass
class NeuralNode:
    node_id: int
    position: List[float]
    activation: float = 0.0
    next_activation: float = 0.0
    energy: float = 1.0
    bias: float = 0.0
    memory_trace: float = 0.0
    coherence: float = 0.0
    phase: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "id": self.node_id,
            "position": self.position,
            "activation": self.activation,
            "energy": self.energy,
            "memoryTrace": self.memory_trace,
            "coherence": self.coherence,
            "phase": self.phase,
        }


@dataclass
class Synapse:
    source: int
    target: int
    weight: float
    glow: float = 0.0
    usage: float = 0.0
    decay: float = 0.96
    pruned: bool = False

    def to_dict(self) -> Dict:
        return {
            "source": self.source,
            "target": self.target,
            "weight": self.weight,
            "glow": self.glow,
            "usage": self.usage,
            "decay": self.decay,
            "pruned": self.pruned,
        }


@dataclass
class WavePulse:
    source: int
    target: int
    amplitude: float
    progress: float = 0.0
    speed: float = 1.0

    def to_dict(self) -> Dict:
        return {
            "source": self.source,
            "target": self.target,
            "amplitude": self.amplitude,
            "progress": self.progress,
            "speed": self.speed,
        }


@dataclass
class MemoryCluster:
    cluster_id: int
    node_ids: List[int]
    stability: float
    coherence: float

    def to_dict(self) -> Dict:
        return {
            "clusterId": self.cluster_id,
            "nodeIds": self.node_ids,
            "stability": self.stability,
            "coherence": self.coherence,
        }


@dataclass
class SimulationMetrics:
    average_activation: float
    memory_cluster_count: int
    synchronization_index: float
    active_synapse_ratio: float
    interference_gain: float
    xor_loss: float
    xor_steps: int

    def to_api_dict(self) -> Dict:
        return {
            "averageActivation": self.average_activation,
            "memoryClusterCount": self.memory_cluster_count,
            "synchronizationIndex": self.synchronization_index,
            "activeSynapseRatio": self.active_synapse_ratio,
            "interferenceGain": self.interference_gain,
            "xorLoss": self.xor_loss,
            "xorSteps": self.xor_steps,
        }
