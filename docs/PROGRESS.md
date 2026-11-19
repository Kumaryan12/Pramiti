# Progress

| Milestone | Status | Verification |
| --- | --- | --- |
| End-to-end MVP | Complete | Chrome flow verified signing, all three scenarios, human review, checkpoint verification, reload, and a mobile-width layout. Docker Compose builds and serves the sandbox. |
| Semantic verification | Complete | Trained gradient boosting on 2,000 synthetic proposals with 800 held-out calibration samples. Verified finite-sample ranks and the singleton decision gate. The trained artifact can be loaded by FastAPI. |
| Synthetic evaluation | Complete | Evaluated four policies on 1,200 held-out proposals, generated charts and metrics, and exercised split spending, replay, and concurrent submissions through the API tests. |
| Render deployment | Configuration complete | Docker and the PostgreSQL-backed test suite were verified. Render account access was unavailable, so public deployment and URL verification are pending. |

The test suite covers Ed25519 signatures, mandate tampering, expiry, replay, spending limits, concurrency, approval logic, ledger integrity, and conformal quantiles. Live OpenAI calls require credentials. The automated test uses a stubbed API response to verify operator authorization and catalogue pricing.

See [research results](RESEARCH.md), [demo steps](DEMO.md), and the [Render setup](DEPLOYMENT.md). The repository uses milestone pushes to `main`.

## Competition audit

- Re-ran the original 21-test suite, frontend build, training and 1,200-case evaluation from `70c2851`. The original unsafe approval rates and the 100% concealed-family failure reproduced.
- Render now requires PostgreSQL explicitly and reports the active database backend at `/health`. Startup records and checks a schema revision under a database lock and adopts the original schema without rewriting previous evidence.
- Render account authorization is pending. No paid or public resources were provisioned.
- Added an independent, SKU-bound synthetic specification registry. Merchant text and listing attributes cannot satisfy a signed requirement. Missing evidence escalates or rejects per signed policy, and verified conflicts reject even if the reviewer or classifier would approve. The user sees the evidence source and failed requirements in the verification screen.
- Measured four policies on 1,320 synthetic proposals, with Wilson intervals and matched review budgets. The prior concealed gap reproduced at 100 unsafe approvals in 100 cases. The revised gate escalated all 100, and the evidence-aware variants tied on unsafe approvals at matched review. The evaluation does not show an incremental security advantage from calibration.
- Migrated optional LLM proposals to the OpenAI Responses SDK with a strict, catalogue-only function and server-owned price, merchant and category. The API records observed listings and the validated tool call. SDK mock-transport tests accepted a valid result and rejected injected fields and unknown SKUs. No runtime API key was available for live calls.
