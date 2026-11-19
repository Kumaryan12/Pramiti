# Deploy PRAMITI

## Local production build

Use Docker Desktop or a compatible Docker engine.

```sh
docker compose up --build -d
curl --fail --retry 6 --retry-all-errors --retry-delay 1 http://127.0.0.1:8000/health
```

Open http://localhost:8000 and [run the demo](DEMO.md). SQLite data persists in the Compose volume. To enable the calibrated gate, use `PRAMITI_BUILD_SEMANTIC=1 docker compose up --build -d`. The Docker build trains the versioned model from checked-in synthetic generators and loads it at startup. This build argument takes a flag, not a credential.

## Deploy the Render Blueprint

You need a Render workspace with permission to create Blueprints, Docker web services and databases. The Render GitHub App also needs read access to the existing private `Kumaryan12/Pramiti` repository. A caller with GitHub repository access must grant the app access to that repository and complete any GitHub organization approval. The CLI returned an authentication error in the current execution environment.

1. Sign in to the [Render Dashboard](https://dashboard.render.com/) and select the intended workspace. Choose **New → Blueprint**.
2. Connect GitHub and authorize the Render GitHub App for **Kumaryan12/Pramiti**. Select the private repository and the **main** branch. Render reads the root `render.yaml`.
3. Inspect the resource preview. It should list a free Docker web service and a free Postgres database. Stop if it proposes a paid resource. Apply the Blueprint. The free Postgres instance expires after 30 days and the free web service can spin down when idle. [Render free-tier limits](https://render.com/docs/free)
4. In the web service’s Environment screen, confirm `DATABASE_URL` comes from the Blueprint’s database connection string, `PRAMITI_REQUIRE_POSTGRES=1`, `SECURE_COOKIES=1`, and `PRAMITI_BUILD_SEMANTIC=1`. Leave `OPENAI_API_KEY` and `LLM_OPERATOR_TOKEN` unset for the public competition demo unless an authorized operator needs the optional LLM mode.
5. Wait until the web service is live. Open the assigned HTTPS home page in an incognito browser without GitHub access, then open `/overview.html`. Run `curl --fail "$PRAMITI_URL/health"` with the assigned HTTPS URL in `PRAMITI_URL`. Expect `"status":"ok"`, `"database":"postgresql"`, and `"payments":"simulated"`.
6. Complete the [demo walkthrough](DEMO.md) from that browser and confirm persistence after a web-service redeploy using the same browser session. Verify the public URL before sharing it.

The startup schema revision runs under a PostgreSQL advisory lock and adopts databases from the original release without rewriting stored mandates or ledger bytes. Production startup fails if the database is configured as SQLite or the recorded schema revision is unsupported. The health endpoint requires a working database connection. There are no live finance credentials or financial integrations in the Blueprint.

With authenticated Render CLI access, select the target workspace and run `render blueprints validate ./render.yaml` before applying. [Render CLI reference](https://render.com/docs/cli-reference)

## Optional live LLM validation

Use a local operator-controlled process. Set `OPENAI_API_KEY` and a strong `LLM_OPERATOR_TOKEN` in the runtime environment without committing either. The default supported model alias is `gpt-5-mini`. Start the local backend and, in the same secret-configured environment, run:

```sh
.venv/bin/python -m scripts.smoke_llm
```

The script uses two LLM calls and two scripted runs with separate synthetic mandates. One LLM run sees the ordinary catalogue and the other sees the misleading compatibility claim. It reports the selected SKU, verifier decision, tool call and ledger head. The proposal-only tool has a strict enum and cannot set price, merchant, category, settlement status or any external action. Dev tests exercise the real SDK with a mock transport. Live validation requires an available key and was pending in this execution.
