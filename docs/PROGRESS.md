# Progress

| Milestone | Status | Verification |
| --- | --- | --- |
| End-to-end MVP | Complete | Chrome flow verified signing, all three scenarios, human review, checkpoint verification, reload, and a mobile-width layout. Docker Compose builds and serves the sandbox. |
| Semantic verification | Complete | Trained gradient boosting on 2,000 synthetic proposals with 800 held-out calibration samples. Verified finite-sample ranks and the singleton decision gate. The trained artifact can be loaded by FastAPI. |
| Synthetic evaluation | Complete | Evaluated four policies on 1,200 held-out proposals, generated charts and metrics, and exercised split spending, replay, and concurrent submissions through the API tests. |
| Render deployment | Configuration complete | Docker and the PostgreSQL-backed test suite were verified. Render account access was unavailable, so public deployment and URL verification are pending. |

The test suite covers Ed25519 signatures, mandate tampering, expiry, replay, spending limits, concurrency, approval logic, ledger integrity, and conformal quantiles. Live OpenAI calls require credentials. The automated test uses a stubbed API response to verify operator authorization and catalogue pricing.

See [research results](RESEARCH.md), [demo steps](DEMO.md), and the [Render setup](DEPLOYMENT.md). The repository uses milestone pushes to `main`.
