# DOD Holograma

Base arquitetural da nova fase do `Cortex Holograma`.

## Visao geral

Esta versao reorganiza o projeto em quatro ideias centrais:

1. `shared`
   Reune os parametros canonicos e o contrato de estado do holograma.
2. `backend`
   Explica e controla a simulacao por HTTP com FastAPI.
3. `frontend`
   Renderiza a esfera holografica viva em Three.js.
4. `future-engines`
   Reservado para os proximos motores: prototipo cientifico em Python e engine de alto desempenho em Java.

## Arquitetura mental

- `centro = energia e sincronizacao`
- `meio = transmissao e interferencia`
- `superficie = consciencia distribuida`

O holograma nao guarda memoria em um ponto fixo. Ele estabiliza padroes distribuidos ao longo da rede.

## Estrutura

```text
dodholograma/
├── README.md
├── backend/
│   ├── app.py
│   └── holograma/
│       ├── __init__.py
│       ├── api.py
│       ├── config.py
│       ├── schemas.py
│       └── services.py
├── frontend/
│   ├── index.html
│   ├── style.20260316-1310.css
│   └── js/
│       ├── holograma-config.js
│       ├── holograma-core.js
│       └── holograma-app.js
├── shared/
│   ├── simulation-profile.json
│   └── state.example.json
└── future-engines/
    ├── java-engine/
    │   └── README.md
    └── python-prototype/
        └── README.md
```

## V1 entregue nesta etapa

- refatoracao da base em modulos menores
- perfil de simulacao compartilhado
- API FastAPI modular
- esfera holografica viva com:
  - nos, sinapses e pulsos
  - beam sensorial
  - beam de referencia
  - clusters de memoria
  - modos globais (`idle`, `processing`, `learning`, `stress`)

## Proximas camadas

### Python prototype

Vai espelhar os mesmos nomes de parametros e o mesmo contrato de estado para experimentacao e ajuste fino.

### Java engine

Vai entrar depois, quando o vocabulário do sistema estiver estavel, para ganhar desempenho sem reescrever a ideia toda.

## Deploy

### Docker local

```bash
cd dodholograma
docker build -t dod-holograma .
docker run -p 8000:8000 dod-holograma
```

Abrir `http://localhost:8000`.

### Render

- o projeto ja inclui `render.yaml`
- publicar a pasta `dodholograma/`
- o container sobe `uvicorn` servindo backend e frontend no mesmo processo

### Observacao sobre gestos

O bridge de webcam com MediaPipe roda localmente e se conecta por WebSocket ao app publicado. Em deploy remoto, a parte de gestos continua dependendo do dispositivo com camera e permissao de webcam.
