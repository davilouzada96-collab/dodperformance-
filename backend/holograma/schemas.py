from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


SceneName = Literal["sphere", "pulses", "xor"]
SourceMode = Literal["api", "pure"]
SystemMode = Literal["idle", "processing", "learning", "stress"]
GestureType = Literal["open_palm", "pinch", "point", "fist", "two_hand_expand", "air_tap"]


class BeamIntensitySchema(BaseModel):
    object: float = Field(default=1.0, ge=0.0, le=4.0)
    reference: float = Field(default=0.72, ge=0.0, le=4.0)


class SimulationConfigSchema(BaseModel):
    nodeCount: int = Field(default=180, ge=32, le=4000)
    synapseDensity: float = Field(default=0.3, ge=0.05, le=1.0)
    learningRate: float = Field(default=0.08, ge=0.0, le=1.0)
    decayRate: float = Field(default=0.94, ge=0.5, le=0.999)
    pruningRate: float = Field(default=0.002, ge=0.0, le=0.2)
    waveSpeed: float = Field(default=1.15, ge=0.05, le=10.0)
    beamIntensity: BeamIntensitySchema = Field(default_factory=BeamIntensitySchema)
    memoryThreshold: float = Field(default=0.62, ge=0.0, le=1.5)
    synchronizationGain: float = Field(default=0.18, ge=0.0, le=2.0)
    clusterStability: float = Field(default=0.78, ge=0.0, le=2.0)
    cameraMode: str = Field(default="orbital")
    renderQuality: str = Field(default="high")
    radius: float = Field(default=5.9, ge=1.0, le=20.0)
    latLines: int = Field(default=22, ge=8, le=120)
    lonLines: int = Field(default=30, ge=8, le=120)
    connectionDistance: float = Field(default=2.65, ge=0.2, le=12.0)


class BeamControlSchema(BaseModel):
    enabled: bool = True
    intensity: float = Field(default=1.0, ge=0.0, le=4.0)
    direction: list[float] = Field(default_factory=lambda: [0.0, 1.0, 0.0], min_length=3, max_length=3)
    phaseOffset: float = 0.0


class StepRequestSchema(BaseModel):
    steps: int = Field(default=1, ge=1, le=5000)


class ConfigureRequestSchema(BaseModel):
    scene: Optional[SceneName] = None
    sourceMode: Optional[SourceMode] = None
    config: Optional[SimulationConfigSchema] = None


class LearningEventSchema(BaseModel):
    boost: float = Field(default=1.0, ge=0.0, le=10.0)
    label: str = "hebbian-event"


class GesturePayloadSchema(BaseModel):
    type: GestureType
    handedness: Optional[Literal["left", "right", "both"]] = None
    rotation: list[float] = Field(default_factory=lambda: [0.0, 0.0], min_length=2, max_length=2)
    zoomDelta: float = 0.0
    pointer: list[float] = Field(default_factory=lambda: [0.5, 0.5], min_length=2, max_length=2)
    depth: float = 0.0
    strength: float = Field(default=0.0, ge=0.0, le=1.0)
    regionHint: Optional[str] = None
    layerSpread: float = Field(default=0.0, ge=0.0, le=1.0)
    pulseRoute: Optional[str] = None


class GestureEnvelopeSchema(BaseModel):
    source: str = "mediapipe"
    timestamp: float = Field(default=0.0, ge=0.0)
    gesture: GesturePayloadSchema


class MetricsSchema(BaseModel):
    averageActivation: float
    memoryClusterCount: int
    synchronizationIndex: float
    activeSynapseRatio: float
    interferenceGain: float
    xorLoss: float
    xorSteps: int


class TopologyResponseSchema(BaseModel):
    nodes: list[list[float]]
    edges: list[list[int]]
    radius: Optional[float] = None


class SimulationStateSchema(BaseModel):
    status: Literal["running", "paused"]
    scene: SceneName
    sourceMode: SourceMode
    step: int
    systemMode: SystemMode
    config: SimulationConfigSchema
    beams: dict[str, BeamControlSchema]
    metrics: MetricsSchema


class ControlResponseSchema(BaseModel):
    ok: bool = True
    action: str
    state: SimulationStateSchema
