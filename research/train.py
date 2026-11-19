import argparse
from pathlib import Path

import joblib
from sklearn.ensemble import GradientBoostingClassifier

from backend.pramiti.semantic import SemanticVerifier, features
from research.dataset import semantic_examples


def train(training, calibration):
    model = GradientBoostingClassifier(n_estimators=80, max_depth=2, random_state=28)
    model.fit([features(row.mandate, row.proposal, row.listing) for row in training],
              [row.label for row in training])
    scores = {str(label): [] for label in model.classes_}
    verifier = SemanticVerifier(model, scores)
    for row in calibration:
        probability = verifier.probabilities(row.mandate, row.proposal, row.listing)[row.label]
        scores[row.label].append(1 - probability)
    for group in scores.values():
        group.sort()
    return verifier


def main():
    parser = argparse.ArgumentParser(description="Train and split-conformal calibrate the synthetic PRAMITI classifier.")
    parser.add_argument("--output", type=Path, default=Path("artifacts/semantic.joblib"))
    args = parser.parse_args()
    training = semantic_examples("train", 2000, 2801)
    calibration = semantic_examples("calibration", 800, 2802)
    verifier = train(training, calibration)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(verifier, args.output)
    print(f"Training: {len(training)}; calibration: {len(calibration)}; artifact: {args.output}")


if __name__ == "__main__":
    main()
