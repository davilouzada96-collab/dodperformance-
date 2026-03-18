# Python Prototype

Primeira camada cientifica do holograma.

## Objetivo

Este prototipo espelha o contrato de estado compartilhado e oferece um motor de experimentacao para:

- propagacao de ondas pela rede
- beams sensorial e de referencia
- reforco hebbiano
- decaimento e poda
- formacao de clusters de memoria
- export de snapshots e metricas

## Estrutura

```text
python-prototype/
├── README.md
├── requirements.txt
└── holograma_proto/
    ├── __init__.py
    ├── cli.py
    ├── config.py
    ├── engine.py
    ├── exporters.py
    └── models.py
```

## Como rodar

```bash
cd future-engines/python-prototype
python3 -m holograma_proto.cli --steps 120 --export-json ./out/state.json --export-csv ./out/metrics.csv
```

## O que sai

- `state.json`: snapshot completo do estado atual
- `metrics.csv`: historico resumido de metricas por passo

## Observacao

O prototipo usa apenas biblioteca padrao para ficar simples de executar e facil de inspecionar.
