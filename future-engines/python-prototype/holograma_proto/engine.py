from __future__ import annotations

import math
import random
from collections import deque
from typing import Deque, Dict, List, Optional, Sequence, Tuple

from .config import load_config_from_profile
from .models import (
    BeamState,
    MemoryCluster,
    NeuralNode,
    SimulationConfig,
    SimulationMetrics,
    Synapse,
    WavePulse,
)


class XorTrainer:
    def __init__(self, learning_rate: float = 0.08, seed: int = 13) -> None:
        rng = random.Random(seed)
        self.dataset = [
            ((0.0, 0.0), 0.0),
            ((0.0, 1.0), 1.0),
            ((1.0, 0.0), 1.0),
            ((1.0, 1.0), 0.0),
        ]
        self.learning_rate = learning_rate
        self.w1 = [[rng.uniform(-0.8, 0.8) for _ in range(4)] for _ in range(2)]
        self.w2 = [rng.uniform(-0.8, 0.8) for _ in range(4)]
        self.b1 = [rng.uniform(-0.3, 0.3) for _ in range(4)]
        self.b2 = rng.uniform(-0.3, 0.3)
        self.steps = 0
        self.loss = 0.0

    @staticmethod
    def sigmoid(value: float) -> float:
        return 1.0 / (1.0 + math.exp(-value))

    def train_step(self) -> Tuple[float, int, str]:
        sample_index = self.steps % len(self.dataset)
        inputs, target = self.dataset[sample_index]

        hidden_values = []
        for hidden_index in range(4):
            total = self.b1[hidden_index]
            for input_index in range(2):
                total += inputs[input_index] * self.w1[input_index][hidden_index]
            hidden_values.append(self.sigmoid(total))

        output_total = self.b2
        for hidden_index in range(4):
            output_total += hidden_values[hidden_index] * self.w2[hidden_index]
        prediction = self.sigmoid(output_total)

        error = target - prediction
        d_out = error * prediction * (1 - prediction)

        for hidden_index in range(4):
            previous = self.w2[hidden_index]
            self.w2[hidden_index] += self.learning_rate * d_out * hidden_values[hidden_index]
            hidden_delta = hidden_values[hidden_index] * (1 - hidden_values[hidden_index]) * d_out * previous
            self.b1[hidden_index] += self.learning_rate * hidden_delta
            for input_index in range(2):
                self.w1[input_index][hidden_index] += self.learning_rate * hidden_delta * inputs[input_index]

        self.b2 += self.learning_rate * d_out
        self.loss = error * error
        self.steps += 1
        return self.loss, self.steps, f"{int(inputs[0])} xor {int(inputs[1])} => {prediction:.3f} | alvo {int(target)}"


class HolographicBrainPrototype:
    def __init__(self, config: Optional[SimulationConfig] = None, seed: int = 42) -> None:
        self.random = random.Random(seed)
        self.config = config or load_config_from_profile()
        self.status = "paused"
        self.scene = "sphere"
        self.source_mode = "python"
        self.system_mode = "idle"
        self.step_index = 0

        self.beams = {
            "object": BeamState(
                enabled=True,
                intensity=self.config.beam_object_intensity,
                direction=[-1.0, 0.25, 0.15],
            ),
            "reference": BeamState(
                enabled=True,
                intensity=self.config.beam_reference_intensity,
                direction=[0.0, 1.0, 0.0],
            ),
        }

        self.nodes: List[NeuralNode] = []
        self.synapses: List[Synapse] = []
        self.adjacency: Dict[int, List[int]] = {}
        self.pulses: Deque[WavePulse] = deque()
        self.memory_clusters: List[MemoryCluster] = []
        self.metrics_history: List[Dict] = []
        self.learning_boost = 1.0
        self.xor_trainer = XorTrainer(learning_rate=max(self.config.learning_rate, 0.02), seed=seed)
        self.prediction_text = "-"

        self.reset()

    def reset(self) -> None:
        self.status = "paused"
        self.system_mode = "idle"
        self.step_index = 0
        self.learning_boost = 1.0
        self.prediction_text = "-"
        self.pulses.clear()
        self.metrics_history = []
        self.nodes = self._build_nodes()
        self.synapses = self._build_synapses()
        self.adjacency = self._build_adjacency()
        self.memory_clusters = []
        self.xor_trainer = XorTrainer(learning_rate=max(self.config.learning_rate, 0.02))
        self.metrics_history.append(self.metrics().to_api_dict())

    def start(self) -> None:
        self.status = "running"

    def pause(self) -> None:
        self.status = "paused"

    def set_scene(self, scene: str) -> None:
        self.scene = scene
        if scene == "xor":
            self.system_mode = "learning"

    def configure(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)

    def set_reference_beam(
        self,
        intensity: Optional[float] = None,
        direction: Optional[Sequence[float]] = None,
    ) -> None:
        if intensity is not None:
            self.beams["reference"].intensity = intensity
        if direction is not None:
            self.beams["reference"].direction = list(direction)

    def inject_sensory_input(self, amplitude: float = 1.0, width: int = 12) -> List[int]:
        object_direction = self._normalize(self.beams["object"].direction)
        scored = []
        for node in self.nodes:
            surface_factor = self._surface_influence(node, object_direction)
            scored.append((surface_factor, node.node_id))
        scored.sort(reverse=True)
        selected = [node_id for _, node_id in scored[:width]]

        for node_id in selected:
            self.nodes[node_id].activation = self._clamp(self.nodes[node_id].activation + amplitude * 0.28, 0.0, 1.6)
            self._emit_from_node(node_id, amplitude)

        return selected

    def trigger_learning_event(self, boost: float = 1.0) -> None:
        self.learning_boost = self._clamp(boost, 0.0, 10.0)
        self.system_mode = "learning"
        for _ in range(max(1, int(5 * self.learning_boost))):
            self._train_xor()

    def step(self, steps: int = 1) -> None:
        self.status = "running"
        for _ in range(steps):
            self.step_index += 1
            self._update_mode()
            self._inject_beams()
            self._advance_pulses()
            self._update_nodes()
            self._hebbian_update()
            self._prune_inactive_synapses()
            self.memory_clusters = self._detect_memory_clusters()
            if self.scene == "xor":
                self._train_xor()
            self.metrics_history.append(self.metrics().to_api_dict())

    def export_state(self) -> Dict:
        metrics = self.metrics()
        top_nodes = sorted(self.nodes, key=lambda node: node.activation + node.memory_trace, reverse=True)[:24]
        top_synapses = sorted(self.synapses, key=lambda synapse: abs(synapse.weight) + synapse.usage, reverse=True)[:40]

        return {
            "status": self.status,
            "scene": self.scene,
            "sourceMode": self.source_mode,
            "step": self.step_index,
            "systemMode": self.system_mode,
            "config": self.config.to_api_dict(),
            "beams": {
                "object": self.beams["object"].to_dict(),
                "reference": self.beams["reference"].to_dict(),
            },
            "metrics": metrics.to_api_dict(),
            "predictionText": self.prediction_text,
            "nodes": [node.to_dict() for node in top_nodes],
            "synapses": [synapse.to_dict() for synapse in top_synapses],
            "memoryClusters": [cluster.to_dict() for cluster in self.memory_clusters],
            "activePulses": [pulse.to_dict() for pulse in list(self.pulses)[:80]],
        }

    def metrics(self) -> SimulationMetrics:
        active_synapses = [synapse for synapse in self.synapses if not synapse.pruned]
        average_activation = self._average([node.activation for node in self.nodes])
        synchronization_index = self._average([node.coherence for node in self.nodes])
        active_synapse_ratio = len(active_synapses) / max(len(self.synapses), 1)
        interference_gain = self._average(
            [
                node.coherence * (0.6 + node.memory_trace * 0.4)
                for node in self.nodes
            ]
        )

        return SimulationMetrics(
            average_activation=average_activation,
            memory_cluster_count=len(self.memory_clusters),
            synchronization_index=synchronization_index,
            active_synapse_ratio=active_synapse_ratio,
            interference_gain=interference_gain,
            xor_loss=self.xor_trainer.loss,
            xor_steps=self.xor_trainer.steps,
        )

    def _build_nodes(self) -> List[NeuralNode]:
        nodes = []
        golden_angle = math.pi * (3 - math.sqrt(5))
        for node_id in range(self.config.node_count):
            t = node_id / max(self.config.node_count - 1, 1)
            y = 1 - t * 2
            radial = math.sqrt(max(0.0, 1.0 - y * y))
            theta = golden_angle * node_id
            x = math.cos(theta) * radial * self.config.radius
            z = math.sin(theta) * radial * self.config.radius
            nodes.append(
                NeuralNode(
                    node_id=node_id,
                    position=[x, y * self.config.radius, z],
                    bias=self.random.uniform(-0.12, 0.12),
                    phase=self.random.uniform(0.0, math.pi * 2),
                )
            )
        return nodes

    def _build_synapses(self) -> List[Synapse]:
        synapses = []
        seen = set()
        max_neighbors = max(4, int(4 + self.config.synapse_density * 6))

        for node in self.nodes:
            scored = []
            for other in self.nodes:
                if other.node_id == node.node_id:
                    continue
                distance = self._distance(node.position, other.position)
                scored.append((distance, other.node_id))
            scored.sort(key=lambda item: item[0])

            for distance, other_id in scored[:max_neighbors + 2]:
                if distance > self.config.connection_distance * 1.55:
                    continue
                if self.random.random() > self.config.synapse_density:
                    continue
                edge_key = tuple(sorted((node.node_id, other_id)))
                if edge_key in seen:
                    continue
                seen.add(edge_key)
                synapses.append(
                    Synapse(
                        source=edge_key[0],
                        target=edge_key[1],
                        weight=self.random.uniform(-1.1, 1.1),
                        decay=self.random.uniform(0.93, 0.98),
                    )
                )

        if not synapses:
            synapses.append(Synapse(source=0, target=1, weight=0.6))
        return synapses

    def _build_adjacency(self) -> Dict[int, List[int]]:
        adjacency = {node.node_id: [] for node in self.nodes}
        for index, synapse in enumerate(self.synapses):
            adjacency[synapse.source].append(index)
            adjacency[synapse.target].append(index)
        return adjacency

    def _normalize(self, vector: Sequence[float]) -> List[float]:
        length = math.sqrt(sum(component * component for component in vector)) or 1.0
        return [component / length for component in vector]

    def _distance(self, a: Sequence[float], b: Sequence[float]) -> float:
        return math.sqrt(sum((a[index] - b[index]) ** 2 for index in range(3)))

    def _clamp(self, value: float, min_value: float, max_value: float) -> float:
        return max(min_value, min(max_value, value))

    def _average(self, values: Sequence[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    def _update_mode(self) -> None:
        if self.scene == "xor":
            self.system_mode = "learning"
        elif self.scene == "pulses":
            self.system_mode = "stress" if self.step_index % 24 == 0 else "processing"
        else:
            cycle = ["idle", "processing", "learning", "stress"]
            self.system_mode = cycle[(self.step_index // 18) % len(cycle)]

    def _inject_beams(self) -> None:
        object_intensity = self.beams["object"].intensity if self.beams["object"].enabled else 0.0
        reference_intensity = self.beams["reference"].intensity if self.beams["reference"].enabled else 0.0
        object_nodes = self.inject_sensory_input(amplitude=object_intensity, width=max(8, int(self.config.node_count * 0.04)))

        reference_scores = []
        for node in self.nodes:
            radial = self._distance(node.position, [0.0, 0.0, 0.0]) / max(self.config.radius, 0.001)
            reference_scores.append((1 - radial, node.node_id))
        reference_scores.sort(reverse=True)
        for _, node_id in reference_scores[:6]:
            self.nodes[node_id].activation = self._clamp(self.nodes[node_id].activation + reference_intensity * 0.12, 0.0, 1.5)
            if node_id not in object_nodes:
                self._emit_from_node(node_id, reference_intensity * 0.35)

    def _emit_from_node(self, node_id: int, amplitude: float) -> None:
        for synapse_index in self.adjacency[node_id]:
            synapse = self.synapses[synapse_index]
            if synapse.pruned:
                continue
            target = synapse.target if synapse.source == node_id else synapse.source
            self.pulses.append(
                WavePulse(
                    source=node_id,
                    target=target,
                    amplitude=self._clamp(amplitude, 0.05, 2.0),
                    progress=0.0,
                    speed=self.config.wave_speed * (0.7 + self.random.random() * 0.5),
                )
            )
            synapse.glow = self._clamp(synapse.glow + amplitude * 0.35, 0.0, 3.0)
            synapse.usage = self._clamp(synapse.usage + amplitude * 0.18, 0.0, 5.0)

    def _advance_pulses(self) -> None:
        next_pulses: Deque[WavePulse] = deque()
        while self.pulses:
            pulse = self.pulses.popleft()
            pulse.progress += 0.18 * pulse.speed
            if pulse.progress >= 1.0:
                target_node = self.nodes[pulse.target]
                target_node.next_activation += pulse.amplitude * 0.24
                target_node.memory_trace = self._clamp(target_node.memory_trace * 0.95 + pulse.amplitude * 0.14, 0.0, 1.6)
                if pulse.amplitude > 0.18:
                    self._cascade_from(pulse.target, pulse.source, pulse.amplitude * 0.74)
            else:
                next_pulses.append(pulse)
        self.pulses = next_pulses

    def _cascade_from(self, node_id: int, previous_node_id: int, amplitude: float) -> None:
        for synapse_index in self.adjacency[node_id]:
            synapse = self.synapses[synapse_index]
            if synapse.pruned:
                continue
            other = synapse.target if synapse.source == node_id else synapse.source
            if other == previous_node_id:
                continue
            if self.random.random() > 0.34:
                continue
            self.pulses.append(
                WavePulse(
                    source=node_id,
                    target=other,
                    amplitude=self._clamp(amplitude, 0.05, 1.6),
                    progress=0.0,
                    speed=self.config.wave_speed * (0.7 + self.random.random() * 0.45),
                )
            )

    def _update_nodes(self) -> None:
        object_direction = self._normalize(self.beams["object"].direction)
        reference_direction = self._normalize(self.beams["reference"].direction)

        for node in self.nodes:
            node.activation *= self.config.decay_rate
            node.energy = self._clamp(node.energy + 0.012 - node.activation * 0.008, 0.05, 1.4)
            surface = self._surface_influence(node, object_direction)
            reference = self._reference_influence(node, reference_direction)
            interference = surface * 0.58 + reference * 0.38 + surface * reference * 0.72
            node.coherence = self._clamp(interference * (1 + self.config.synchronization_gain), 0.0, 1.8)
            node.activation = self._clamp(node.activation + node.next_activation + node.coherence * 0.04, 0.0, 1.6)
            node.memory_trace = self._clamp(node.memory_trace * 0.986 + node.activation * 0.024, 0.0, 1.6)
            node.phase += self.config.wave_speed * 0.03
            node.next_activation = 0.0

    def _surface_influence(self, node: NeuralNode, direction: Sequence[float]) -> float:
        node_dir = self._normalize(node.position)
        beam_focus = self._clamp(
            -(node_dir[0] * direction[0] + node_dir[1] * direction[1] + node_dir[2] * direction[2]),
            0.0,
            1.0,
        )
        shell_factor = self._clamp(self._distance(node.position, [0.0, 0.0, 0.0]) / self.config.radius, 0.0, 1.0)
        return beam_focus * shell_factor

    def _reference_influence(self, node: NeuralNode, direction: Sequence[float]) -> float:
        radial = self._distance(node.position, [0.0, 0.0, 0.0]) / self.config.radius
        axis_alignment = abs(
            self._normalize(node.position)[0] * direction[0]
            + self._normalize(node.position)[1] * direction[1]
            + self._normalize(node.position)[2] * direction[2]
        )
        return self._clamp((1 - radial) * 0.72 + axis_alignment * 0.28, 0.0, 1.0)

    def _hebbian_update(self) -> None:
        for synapse in self.synapses:
            if synapse.pruned:
                continue
            source_node = self.nodes[synapse.source]
            target_node = self.nodes[synapse.target]
            co_activation = source_node.activation * target_node.activation
            coherence_term = (source_node.coherence + target_node.coherence) * 0.5

            synapse.weight += self.config.learning_rate * 0.02 * co_activation * (1 + self.learning_boost * 0.1)
            synapse.weight -= (1 - self.config.decay_rate) * 0.12
            synapse.usage = self._clamp(synapse.usage * 0.975 + co_activation * 0.35 + coherence_term * 0.08, 0.0, 6.0)
            synapse.glow = self._clamp(synapse.glow * synapse.decay + co_activation * 0.26, 0.0, 4.0)
            synapse.weight = self._clamp(synapse.weight, -2.8, 2.8)

    def _prune_inactive_synapses(self) -> None:
        for synapse in self.synapses:
            if synapse.pruned:
                continue
            inactivity = 1 - self._clamp(synapse.usage / 1.5, 0.0, 1.0)
            if abs(synapse.weight) < self.config.pruning_rate * 8 and inactivity > 0.92:
                synapse.pruned = True
                synapse.glow = 0.0

    def _detect_memory_clusters(self) -> List[MemoryCluster]:
        score_map = {}
        for node in self.nodes:
            score = node.activation * 0.5 + node.memory_trace * 0.34 + node.coherence * 0.42
            if score >= self.config.memory_threshold * 0.55:
                score_map[node.node_id] = score

        visited = set()
        clusters = []
        cluster_id = 0

        for node_id in score_map:
            if node_id in visited:
                continue
            queue = deque([node_id])
            cluster_nodes = []
            stability_sum = 0.0
            coherence_sum = 0.0

            while queue:
                current = queue.popleft()
                if current in visited or current not in score_map:
                    continue
                visited.add(current)
                cluster_nodes.append(current)
                node = self.nodes[current]
                stability_sum += score_map[current]
                coherence_sum += node.coherence

                for synapse_index in self.adjacency[current]:
                    synapse = self.synapses[synapse_index]
                    if synapse.pruned:
                        continue
                    neighbor = synapse.target if synapse.source == current else synapse.source
                    if neighbor not in visited and neighbor in score_map:
                        queue.append(neighbor)

            if cluster_nodes:
                clusters.append(
                    MemoryCluster(
                        cluster_id=cluster_id,
                        node_ids=cluster_nodes,
                        stability=stability_sum / len(cluster_nodes),
                        coherence=coherence_sum / len(cluster_nodes),
                    )
                )
                cluster_id += 1

        return clusters

    def _train_xor(self) -> None:
        loss, _, prediction_text = self.xor_trainer.train_step()
        self.prediction_text = prediction_text
        self.learning_boost = self._clamp(self.learning_boost * 0.995 + loss * 0.2, 0.5, 6.0)
