FROM node:22-bookworm-slim AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY docs/results/competition/metrics.json /app/docs/results/competition/metrics.json
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 pramiti \
    && mkdir /app/data && chown pramiti /app/data
ARG PRAMITI_BUILD_SEMANTIC=0
COPY requirements-semantic.txt ./
RUN if [ "$PRAMITI_BUILD_SEMANTIC" = "1" ]; then pip install --no-cache-dir -r requirements-semantic.txt; fi
COPY backend/ backend/
COPY research/ research/
RUN if [ "$PRAMITI_BUILD_SEMANTIC" = "1" ]; then python -m research.train --output /app/model/semantic.joblib; fi
COPY --from=web /app/frontend/dist frontend/dist
ENV DATABASE_URL=sqlite:////app/data/pramiti.db
USER pramiti
EXPOSE 8000
CMD ["sh", "-c", "if [ -z ${PRAMITI_MODEL_PATH:-} ] && [ -f /app/model/semantic.joblib ]; then export PRAMITI_MODEL_PATH=/app/model/semantic.joblib; fi; exec uvicorn backend.pramiti.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
