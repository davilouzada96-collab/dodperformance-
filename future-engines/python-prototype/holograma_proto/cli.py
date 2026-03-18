from __future__ import annotations

import argparse
from pathlib import Path

from .engine import HolographicBrainPrototype
from .exporters import export_metrics_csv, export_state_json


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Executa o prototipo cientifico do holograma.")
    parser.add_argument("--steps", type=int, default=120, help="Quantidade de passos da simulacao.")
    parser.add_argument("--scene", default="sphere", choices=["sphere", "pulses", "xor"], help="Cena inicial.")
    parser.add_argument("--input-amplitude", type=float, default=1.0, help="Intensidade do beam sensorial.")
    parser.add_argument("--learning-boost", type=float, default=1.0, help="Boost de aprendizado.")
    parser.add_argument("--export-json", type=Path, default=None, help="Caminho para exportar o estado final.")
    parser.add_argument("--export-csv", type=Path, default=None, help="Caminho para exportar metricas em CSV.")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    prototype = HolographicBrainPrototype()
    prototype.set_scene(args.scene)
    prototype.start()
    prototype.inject_sensory_input(amplitude=args.input_amplitude)
    prototype.trigger_learning_event(boost=args.learning_boost)
    prototype.step(args.steps)

    state = prototype.export_state()

    if args.export_json:
        export_state_json(args.export_json, state)
    if args.export_csv:
        export_metrics_csv(args.export_csv, prototype.metrics_history)

    metrics = state["metrics"]
    print("Holograma Python Prototype")
    print(f"scene={state['scene']}")
    print(f"step={state['step']}")
    print(f"systemMode={state['systemMode']}")
    print(f"averageActivation={metrics['averageActivation']:.4f}")
    print(f"memoryClusterCount={metrics['memoryClusterCount']}")
    print(f"synchronizationIndex={metrics['synchronizationIndex']:.4f}")
    print(f"activeSynapseRatio={metrics['activeSynapseRatio']:.4f}")
    print(f"xorLoss={metrics['xorLoss']:.6f}")
    print(f"xorSteps={metrics['xorSteps']}")
    print(state["predictionText"])


if __name__ == "__main__":
    main()
