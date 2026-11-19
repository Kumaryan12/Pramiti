# PRAMITI · प्रमिति

Proof of Intent for Agentic Finance. An independent authorization and evidence layer for simulated agent payments, built for the GIFT FutureLab Grand Challenge 2026–27.

## Run locally

Use Python 3.12+ and Node.js 22+.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
npm --prefix frontend ci
npm --prefix frontend run build
.venv/bin/python -m uvicorn backend.pramiti.main:app --port 8000
```

Open http://localhost:8000. Open `/health` for the health check and `/docs` for the HTTP API. For frontend hot reload, run `npm --prefix frontend run dev` alongside the backend and use the Vite URL.

```sh
.venv/bin/python -m pytest -q
```

See the [demo walkthrough](docs/DEMO.md), [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), [research](docs/RESEARCH.md), and [progress](docs/PROGRESS.md). Local state uses SQLite. The sandbox settles synthetic transactions only.
