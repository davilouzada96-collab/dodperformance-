# DOD Performance

Projeto DOD Performance preparado para deploy em Cloudflare Pages (frontend) e Render (backend FastAPI).

## Estrutura atual

- `index.html`: entrada principal do frontend
- `script.js`: lógica do frontend
- `style.20260304.4.css`: estilos do frontend
- `assets/`: imagens estáticas
- `backend/app.py`: backend FastAPI (serve os arquivos estáticos da raiz)
- `backend/requirements.txt`: dependências Python
- `scripts/check-assets.sh`: auditoria de referências `/assets`
- `Dockerfile`: build para deploy no Render
- `render.yaml`: configuração do serviço no Render
- `vercel.json`: rewrites SPA (opcional)

## Deploy

- Cloudflare Pages:
  - Framework preset: `None`
  - Build command: vazio
  - Output directory: `.`
- Domínios:
  - `dodperformance.com.br`
  - `www.dodperformance.com.br`

## Como rodar local

```bash
docker build -t dod-performance .
docker run -p 8000:8000 dod-performance
```

Depois acesse `http://localhost:8000`.

## Validação de assets

```bash
./scripts/check-assets.sh
```

- Retorna `0` quando todos os arquivos referenciados em `/assets` existem.
- Retorna `1` quando há arquivos faltantes e imprime a lista completa.

## Estrategia editorial (novo)

- `content/editorial/trilhas.json`: trilhas, regras editoriais e posicionamento do DoD.
- `content/editorial/template-artigo.md`: template unico de producao.
- `docs/calendario-editorial-12-semanas.md`: calendario com cadencia fixa.
- `docs/playbook-editorial-dod.md`: rotina operacional semanal (forca bruta).

## Modo Editorial (feature flag)

- Ativacao via query param: `?editorial=1`
- Endpoint principal: `/editorial/trilhas.json`
- Endpoints auxiliares:
  - `/editorial/template-artigo.md`
  - `/editorial/calendario-12-semanas.md`
  - `/editorial/playbook.md`

Com a flag desligada, o comportamento atual do site permanece igual.

## Etapa 4 (toggle + persistencia)

- Toggle visual no topo: `editorial: on/off`
- Persistencia local: `localStorage` (`dod_editorial_mode`)
- Prioridade de ativacao:
  1. Query param `?editorial=1` (ou `true/on`)
  2. Valor salvo em `localStorage`

No modo editorial, a home mostra o Hub Editorial e o bloco "Ultimas Hipoteses" alimentado por:
- `/editorial/calendario-12-semanas.md`
- `/editorial/playbook.md`

## Etapa 5 (estilo editorial no CSS)

- Remocao de `inline styles` do modo editorial no `script.js`
- Novas classes em `style.20260304.4.css`:
  - `.editorial-toggle`
  - `.editorial-hub`
  - `.editorial-hero-card`, `.editorial-hero-title`, `.editorial-hero-copy`
  - `.editorial-track-card`, `.editorial-track-title`, `.editorial-track-objective`, `.editorial-track-question`, `.editorial-track-action`
  - `.editorial-insights`, `.editorial-insight-card`, `.editorial-insight-title`, `.editorial-list`
