"""Compare decision rules on held-out synthetic proposals, using the deployed verification code."""

import argparse
import base64
import csv
import json
from collections import Counter
from pathlib import Path
from statistics import median, quantiles
from time import perf_counter_ns

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from backend.pramiti.domain import SignedMandate
from backend.pramiti.firewall import verify
from backend.pramiti.semantic import CONFORMANT, NONCONFORMING, calibrated_decision, load_verifier
from research.dataset import FAMILIES, UNSEEN, create_split

METHODS = ("Spending limit", "Firewall", "Firewall + ML", "PRAMITI")


def sign(key, mandate):
    payload = mandate.model_dump_json()
    return SignedMandate(
        payload=payload, public_key=base64.b64encode(key.public_key().public_bytes_raw()).decode(),
        signature=base64.b64encode(key.sign(payload.encode())).decode(),
    )


def decide(method, row, envelope, verifier):
    if method == METHODS[0]:
        return ("ALLOW" if row.proposal.amount <= row.mandate.max_amount else "REJECT"), None

    decision, reasons, _ = verify(
        row.proposal, row.mandate, envelope, row.used, replay=row.replay, catalogue={row.listing.id: row.listing},
    )
    if method == METHODS[1] or decision == "REJECT":
        return decision, None
    if method == METHODS[2]:
        if decision != "ALLOW":
            return decision, None
        probability = verifier.probabilities(row.mandate, row.proposal, row.listing)[CONFORMANT]
        return ("ALLOW" if probability >= 0.5 else "REJECT"), None

    prediction = verifier.predict(row.mandate, row.proposal, row.listing)
    decision, _ = calibrated_decision(decision, reasons, prediction)
    return decision, prediction["prediction_set"]


def run(rows, verifier):
    key = Ed25519PrivateKey.generate()
    results = []
    for cohort, examples in rows.items():
        for example in examples:
            envelope = sign(key, example.mandate)
            for method in METHODS:
                start = perf_counter_ns()
                decision, prediction_set = decide(method, example, envelope, verifier)
                milliseconds = (perf_counter_ns() - start) / 1_000_000
                results.append({
                    "id": example.id, "cohort": cohort, "family": example.family,
                    "truth": example.label, "method": method, "decision": decision,
                    "milliseconds": milliseconds, "prediction_set": prediction_set,
                })
    return results


def ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def summarize(rows):
    counts = Counter((row["truth"], row["decision"]) for row in rows)
    unsafe = sum(count for (truth, _), count in counts.items() if truth == NONCONFORMING)
    benign = len(rows) - unsafe
    times = [row["milliseconds"] for row in rows]
    return {
        "total": len(rows), "nonconforming": unsafe, "conformant": benign,
        "unsafe_approval_rate": ratio(counts[NONCONFORMING, "ALLOW"], unsafe),
        "human_review_rate": ratio(sum(row["decision"] == "ESCALATE" for row in rows), len(rows)),
        "false_rejection_rate": ratio(counts[CONFORMANT, "REJECT"], benign),
        "false_nonapproval_rate": ratio(counts[CONFORMANT, "REJECT"] + counts[CONFORMANT, "ESCALATE"], benign),
        "median_ms": median(times),
        "p95_ms": quantiles(times, n=100, method="inclusive")[94],
    }


def set_metrics(rows):
    result = {}
    for truth in (CONFORMANT, NONCONFORMING):
        eligible = [row for row in rows if row["truth"] == truth and row["prediction_set"] is not None]
        result[truth] = {
            "scored": len(eligible),
            "coverage": ratio(sum(truth in row["prediction_set"] for row in eligible), len(eligible)),
        }
    return result


def metrics(results):
    by_method = {method: [row for row in results if row["method"] == method] for method in METHODS}
    return {
        "overall": {method: summarize(rows) for method, rows in by_method.items()},
        "by_cohort": {
            cohort: {method: summarize([row for row in rows if row["cohort"] == cohort])
                     for method, rows in by_method.items()} for cohort in ("Known", "Unseen")
        },
        "by_family": {
            family: {method: summarize([row for row in rows if row["family"] == family])
                     for method, rows in by_method.items()} for family in (*FAMILIES[1:], *UNSEEN)
        },
        "scored_set_coverage": {
            cohort: set_metrics([row for row in by_method["PRAMITI"] if row["cohort"] == cohort])
            for cohort in ("Known", "Unseen")
        },
    }


def verify_splits(verifier, test_rows):
    ids = [*verifier.training_ids, *verifier.calibration_ids, *(row.id for row in test_rows)]
    if not verifier.training_ids or not verifier.calibration_ids or len(set(ids)) != len(ids):
        raise ValueError("Training, calibration and test must have disjoint unique fixture IDs")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=Path("artifacts/semantic.joblib"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/evaluation"))
    args = parser.parse_args()

    known = list(create_split("known-test", 900, 2803))
    unseen = list(create_split("unseen-test", 300, 2804, ("benign", *UNSEEN)))
    verifier = load_verifier(args.model)
    verify_splits(verifier, known + unseen)
    results = run({"Known": known, "Unseen": unseen}, verifier)
    summary = metrics(results)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "metrics.json").write_text(json.dumps(summary, indent=2) + "\n")
    with (args.output / "decisions.csv").open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    from research.plots import plot

    plot(summary, args.output)
    print(json.dumps(summary["overall"], indent=2))


if __name__ == "__main__":
    main()
