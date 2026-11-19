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
