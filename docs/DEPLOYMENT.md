# Deployment

## Docker

Run `docker compose up --build` and open http://localhost:8000. The Compose volume persists the local SQLite database.

## Render

1. Sign in to the [Render Dashboard](https://dashboard.render.com/) and choose **New → Blueprint**.
2. Connect GitHub, grant Render access to the private **Kumaryan12/Pramiti** repository, then select the **main** branch and apply the root `render.yaml` Blueprint. The Blueprint defines a free Docker web service and free Postgres. PostgreSQL persists app data across web-service restarts. Free PostgreSQL expires after 30 days. Review [Render’s limits](https://render.com/docs/free) before using it for a long-lived demo.
3. Wait for the web service and database to finish deploying. Open the assigned HTTPS URL and check its `/health` route.
4. Complete the [demonstration](DEMO.md) on the deployed frontend. Verify the transaction statuses and evidence chain.
5. Optional LLM mode requires setting `OPENAI_API_KEY` and a high-entropy `LLM_OPERATOR_TOKEN` in the web service environment. Set `OPENAI_MODEL` to override the default. Share the operator token only with authorized demo operators. Rotate it if exposed.

This deployment is a simulated payment sandbox. Browser sessions provide demo isolation. The free web service may cold-start after idle periods.
