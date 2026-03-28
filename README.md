# DOD Performance

Projeto DOD Performance preparado para deploy em Cloudflare Pages (frontend) e Render (backend FastAPI).

## Estrutura atual

- `index.html`: entrada principal do frontend
- `script.js`: lógica do frontend
- `style.20260304.4.css`: estilos do frontend
- `assets/`: imagens estáticas
- `backend/app.py`: backend FastAPI (serve os arquivos estáticos da raiz)
- `backend/requirements.txt`: dependências Python
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
