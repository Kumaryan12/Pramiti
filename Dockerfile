FROM node:22-bookworm-slim AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 pramiti \
    && mkdir /app/data && chown pramiti /app/data
COPY backend/ backend/
COPY --from=web /app/frontend/dist frontend/dist
ENV DATABASE_URL=sqlite:////app/data/pramiti.db
USER pramiti
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn backend.pramiti.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
