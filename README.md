# DOD Performance

Projeto DOD Performance preparado para deploy com Render.

## O que foi mantido

- `render.yaml` com serviço `dod-performance`
- `Dockerfile` para build e deploy
- front-end principal em `index.html`
- backend FastAPI em `backend/app.py`

## O que foi removido

- pacote de holograma e seus endpoints
- frontend de holograma em `frontend/`
- motor de protótipos em `future-engines/`
- dados de simulação em `shared/`
- página extra `Cortex neural /`

## Como rodar local

```bash
docker build -t dod-performance .
docker run -p 8000:8000 dod-performance
```

Depois acesse `http://localhost:8000`.
