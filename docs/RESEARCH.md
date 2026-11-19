# PRAMITI research evaluation

## Reproduced baseline and cause

Re-ran training and the 1,200-case evaluation at commit `70c2851`. The original firewall approved **314/1,000** unsafe proposals and the original calibrated system approved **103/1,000**, while reviewing **418/1,200** proposals. Both approved **100/100** concealed-specification proposals. The listing title, merchant claims and structured listing attributes all repeated the desired specification. The verifier had no provenance field and interpreted the merchant’s claim as an independent attribute. The classifier received the same apparently compatible inputs, so it had no missing-evidence signal.

The current verifier checks a separate, server-controlled synthetic inspection registry linked to the exact SKU. It records independently verified compatibility, a verified conflict, missing evidence, or merchant-only evidence. A verified conflict is a hard rejection. A missing observation escalates or rejects under the signed policy, including when the prediction set is a singleton conformant. Compatible cases can still escalate under a signed consent rule or the optional calibrated policy. Signed structured attributes define enforceable constraints. The verifier supplements them with supported units, paper sizes and materials from the signed instruction. It escalates qualified prose such as “at least” for human interpretation.

## Reproduce

```sh
.venv/bin/pip install -r requirements-dev.txt -r requirements-research.txt
.venv/bin/python -m research.train
.venv/bin/python -m research.evaluate --output artifacts/competition
```

The evaluator writes decision-level CSV, machine-readable metrics and chart PNGs. [Competition results](results/competition/metrics.json) and [prior baseline snapshot](results/metrics.json).

### Design and leakage checks

- The classifier was fit on 2,000 synthetic examples. Separate class-conditional calibration used 400 conformant and 400 nonconforming cases. Train, calibration and test fixture IDs are checked for overlap against the loaded model. The data generator uses separate seeds per split.
- All four policies were evaluated on the same 1,320 proposals: 900 in the known synthetic suite, 300 in a shift suite containing 100 fresh benign cases and 200 attacks from held-out families, and 120 benign substitutes with an incomplete inspection. The shift suite includes 100 concealed specifications and 100 understated checkout amounts.
- Observations available to the gate include listing text, recorded specifications and inspection provenance. For the original fully concealed fixtures, the new provenance channel has no independently verified record. The ambiguous benign cohort also lacks inspection of the specified attribute. Simulator labels, attack-family IDs and post-decision records never enter the verifier or the classifier. The experiment assumes the synthetic registry is trusted. Missing records are represented in the fixture generator as pre-checkout evidence, so this experiment tests a conservative policy for that trust model.
- The model’s eight features are the original lexical and numeric comparisons, SKU match indicator and amount-to-limit ratio. Product IDs are used only for equality. Product types and wording templates recur in the known suite. The audit found three distinct feature vectors shared between training and calibration, two between training and the known suite, and one between calibration and the known suite. Different proposals can map to the same vector. The corpus is not a product- or merchant-disjoint external validation set. Both shifted manipulation families were excluded from model fitting and calibration.
- Replay, concurrent and split-budget rows represent observed pre-execution state in the comparison. The API tests separately exercise actual concurrent requests, locking and settlement. The experiment simulates merchant-influenced decisions and cannot measure a live LLM’s resistance.

### Class-conditional conformal gate

The nonconformity score for class `y` is `1 − P(y | x)`. For class size `n`, the corrected threshold is the sorted score at one-indexed rank `ceil((n + 1)(1 − α))`. If this exceeds `n`, the threshold is infinite. The implementation uses the equivalent rank test `(1 + count(calibration score ≥ candidate score)) / (n + 1) > α` and handles ties conservatively. A missing calibration class has p-value 1 by this rule. The gate auto-approves only the exact set `{conformant}`; empty, two-label and nonconforming sets route to review. The hard and independent-evidence gates take precedence.

The class-conditional coverage statement assumes exchangeability within each label between calibration and new observations, conditional on the independently fit model. Selecting a subset that passes the firewall or changing the mix of products, sellers or evidence sources can break that assumption. These results do not bound the unsafe fraction among approved payments. See [Theoretical Foundations of Conformal Prediction](https://arxiv.org/abs/2411.11824) and [Class-Conditional Conformal Prediction with Many Classes](https://arxiv.org/abs/2306.09335).

## Native operating points

| Policy | Unsafe auto-approval (95% Wilson) | Human review | False rejection | Legitimate auto-approval | p95, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Signed amount and basic authorization | 90.0% (88.0–91.7%) | 0.0% | 0.0% | 100.0% | 0.159 |
| Evidence-aware deterministic firewall | 0.0% (0–0.38%) | 16.7% | 0.0% | 62.5% | 0.178 |
| Firewall + conventional ML | 0.0% (0–0.38%) | 16.7% | 0.0% | 62.5% | 0.252 |
| Firewall + calibrated gate | 0.0% (0–0.38%) | 18.3% | 0.0% | 55.9% | 0.252 |

Unsafe approval divides approved unsafe proposals by 1,000 unsafe proposals. Attack success uses the same definition within each family. Human review divides escalations by all 1,320 proposals. False rejection and legitimate auto-approval each use 320 conformant proposals. Wilson intervals describe case-level binomial sampling uncertainty and do not account for correlation across templates. Latency is measured inside the policy pipeline on the development machine and excludes network, database and signing time. The JSON includes all intervals, medians and cohort denominators.

### Cohorts

- **Known suite:** The evidence-aware firewall and both learned variants recorded 0/800 unsafe auto-approvals. The deterministic and conventional gates approved 100/100 benign cases, and the calibrated gate approved 87/100.
- **Held-out suite:** All three firewall variants recorded 0/200 unsafe auto-approvals. All 100 checkout discrepancies were rejected and all 100 merchant-only concealed-specification cases escalated. On the 100 fresh benign cases, the deterministic and conventional gates approved 100, and the calibrated gate approved 92.
- **Ambiguous benign substitutes:** All 120 went to review under the three evidence-aware policies. The calibrated set contained the true label in 1/120. None of the 100 held-out concealed cases had the true nonconforming label in its set. The evidence gate still escalated them. The known set contained the conformant label in 87/100 known benign cases. Known nonconforming cases were rejected before scoring, so conditional coverage there is undefined.

### Matched review rates

The [security–autonomy frontier](results/competition/frontier.png) keeps each policy’s native reviews and rejections. It adds reviews only from otherwise-approved proposals until every policy reviews the same number. Unscored systems use a fixed, label-blind hash order. Conventional ML ranks by estimated nonconforming probability, and PRAMITI ranks by the nonconforming conformal p-value. The plotted range contains the jointly feasible review budgets.

At the first common budget of 241/1,320 reviews (18.26%), the basic authorization baseline approved 726 unsafe proposals. Each evidence-aware system approved zero and automatically approved 179/320 legitimate proposals. At 20% review, each evidence-aware system still approved zero unsafe proposals. The experiment attributes the observed security gain to independent evidence and shows no added security gain from calibration at matched review. At native settings, calibration adds reviews of otherwise eligible legitimate proposals.

[Decision trade-offs](results/competition/tradeoffs.png) · [Attack families](results/competition/families.png) · [Known vs held-out](results/competition/known-unseen.png) · [Latency](results/competition/latency.png)

## Remaining limitations

The verifier depends on the accuracy, freshness and custody of the evidence registry. A wrong trusted record or item change after verification can defeat that trust model. The prototype uses synthetic records and does not integrate an external attestation authority. Free-text parsing covers a small set of attributes and simple phrasing. Reviews take place in the same browser session and a note documents the reviewer’s decision without proving the underlying fact. The synthetic test corpus informed improvements to the parser, so these findings need confirmation on independently collected, frozen benchmarks.
