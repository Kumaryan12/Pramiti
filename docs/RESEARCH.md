# Research

The optional semantic verifier uses gradient boosting on eight observations available before execution. Features compare the signed instruction against the catalogue title, verified attributes, and description. They also capture the requested SKU and ratio of proposed amount to the signed limit. Training uses synthetic labels. Family names, split identifiers, ledger outcomes, and reviewer decisions are excluded from the feature vector.

For each true class, store the sorted held-out scores `1 − P(class | features)`. With class size `n`, the finite-sample threshold is the one-indexed rank `ceil((n + 1) × (1 − alpha))`. If the rank exceeds `n`, use an infinite threshold. At runtime the equivalent rank test keeps labels with `(1 + count(calibration score ≥ candidate score)) / (n + 1) > alpha`, so ties are conservative.

Class-conditional coverage concerns the true label’s inclusion under exchangeability within the class between calibration and future observations, conditional on the independently fit model. This does not establish coverage for a fixed subgroup, a new merchant distribution, or an unseen manipulation. It does not bound the proportion of unsafe payments among auto-approved payments.

The semantic gate auto-approves only the singleton set **{conformant}** and only after the deterministic policy would approve. Other sets escalate. Hard policy violations reject and deterministic review rules remain in force.

## Run

```sh
.venv/bin/pip install -r requirements-research.txt
.venv/bin/python -m research.train
PRAMITI_MODEL_PATH=artifacts/semantic.joblib .venv/bin/python -m uvicorn backend.pramiti.main:app --port 8000
```

Load artifacts generated locally by this training script. Without a configured artifact the app uses its deterministic verifier. See [Theoretical Foundations of Conformal Prediction](https://arxiv.org/abs/2411.11824) and [Class-Conditional Conformal Prediction with Many Classes](https://arxiv.org/abs/2306.09335).

## Held-out experiment

```sh
.venv/bin/python -m research.evaluate
```

The evaluator compares a spending-cap-only policy, the production deterministic verifier, the firewall followed by a conventional 0.5 probability cutoff, and the firewall followed by the calibrated gate. It executes the same Ed25519, deterministic and semantic functions used by the application. Tests independently exercise settlement, replay, split spending, and concurrent reservations through the HTTP API and both database engines. The evaluation’s split and concurrent budget fixtures supply the observed committed total. They do not benchmark parallel database execution. The text and review manipulation fixtures model shopper outcomes using synthetic catalogue descriptions and verified product attributes. They do not measure an external LLM’s susceptibility.

The model saw 2,000 training and 800 calibration examples. The evaluation uses independent seeds and verifies distinct fixture IDs from the trained model’s recorded split membership. The known suite contains 900 proposals across benign, catalogue, and transaction cases. The shift suite contains 100 fresh benign proposals and 200 proposals from two manipulation families omitted from training and calibration. Product types and template structures recur in the known suite by design. Field values and examples are drawn independently. The scored-set coverage figures are conditional on reaching the semantic gate in these suites.

| Policy | Unsafe approvals | Human review | False rejections |
| --- | ---: | ---: | ---: |
| Spending limit | 90.0% | 0.0% | 0.0% |
| Firewall | 31.4% | 15.5% | 0.0% |
| Firewall + ML | 11.8% | 15.5% | 0.0% |
| PRAMITI | 10.3% | 34.8% | 0.0% |

Unsafe approvals use the 1,000 nonconforming proposals as the denominator. Human-review rates use all 1,200 proposals. False rejections use the 200 conformant proposals. PRAMITI escalated 10.5% of conformant proposals. Known-family unsafe approvals were 0.375% with PRAMITI versus 2.25% with conventional ML. Across the two held-out families, all firewall-based approaches approved 50% of nonconforming proposals. They rejected the checkout mismatches and approved every concealed specification gap because the visible evidence claimed the authorized configuration.

Observed true-label inclusion for PRAMITI was 87% on known conformant cases and 94% on known scored nonconforming cases. On the shifted suite it was 92% for conformant cases and 0% for scored nonconforming cases. The other nonconforming shift family was rejected by the hard checks before semantic scoring. These results describe the synthetic corpus and reveal a blind spot when the observed listing fully conceals the product mismatch.

The [trade-off](results/tradeoffs.png), [attack family](results/families.png), [known vs held-out](results/known-unseen.png), and [latency](results/latency.png) charts reflect this run. See the [machine-readable snapshot](results/metrics.json). The evaluator also writes a per-proposal CSV when run locally. Latency measures in-process policy verification on the development machine, with signing, network, and database work outside the timer.
