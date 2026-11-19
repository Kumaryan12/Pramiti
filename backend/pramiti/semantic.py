import math
import re
from bisect import bisect_left
from dataclasses import dataclass
from pathlib import Path

CONFORMANT = "conformant"
NONCONFORMING = "nonconforming"
WORD = re.compile(r"[a-z0-9]+(?:[.-][a-z0-9]+)*")
CONTENT_WORDS = {"buy", "get", "please", "find", "order", "need", "the", "a", "an", "for", "with", "and"}
VERSION = 2


def words(text):
    return set(WORD.findall(text.casefold())) - CONTENT_WORDS


def threshold(scores, alpha):
    """One-based rank, with an infinite threshold when the sample is too small."""
    if not 0 < alpha < 1:
        raise ValueError("alpha must be strictly between zero and one")
    n = len(scores)
    rank = math.ceil((n + 1) * (1 - alpha))
    return math.inf if rank > n else sorted(scores)[rank - 1]


def features(mandate, proposal, product):
    """Pre-execution observations shared by runtime and the experiment."""
    request = words(mandate.instruction)
    title = words(product.title)
    description = words(product.description)
    required = {item.casefold() for item in mandate.requirements}
    listing = set(product.requirements)
    numeric_request = {word for word in request if any(c.isdigit() for c in word)}
    numeric_listing = {word for word in title | listing if any(c.isdigit() for c in word)}
    return [
        len(request & title) / max(1, len(request)),
        len(request & description) / max(1, len(request)),
        len(required - listing) / max(1, len(required)),
        len(numeric_request - numeric_listing) / max(1, len(numeric_request)),
        len((required & description) - listing) / max(1, len(required)),
        int(mandate.product_id is not None and mandate.product_id != product.id),
        proposal.amount / mandate.max_amount,
        len(description) / max(1, len(title)),
    ]


@dataclass
class SemanticVerifier:
    model: object
    calibration: dict[str, list[float]]
    training_ids: tuple[str, ...] = ()
    calibration_ids: tuple[str, ...] = ()
    version: int = VERSION

    def probabilities(self, mandate, proposal, product):
        row = self.model.predict_proba([features(mandate, proposal, product)])[0]
        return {str(label): float(p) for label, p in zip(self.model.classes_, row)}

    def predict(self, mandate, proposal, product, alpha=0.1):
        return self.calibrate(self.probabilities(mandate, proposal, product), alpha)

    def calibrate(self, probabilities, alpha=0.1):
        if not 0 < alpha < 1:
            raise ValueError("alpha must be strictly between zero and one")
        # With >= for ties this rank test is equivalent to the finite-sample threshold.
        p_values = {}
        for label, probability in probabilities.items():
            scores = self.calibration[label]
            score = 1 - probability
            p_values[label] = (1 + len(scores) - bisect_left(scores, score)) / (len(scores) + 1)
        return {"alpha": alpha, "prediction_set": [label for label, p in p_values.items() if p > alpha],
                "p_values": p_values}


def load_verifier(path):
    if not path:
        return None
    # Only load an artifact generated and controlled by the service operator.
    import joblib

    verifier = joblib.load(Path(path))
    if not isinstance(verifier, SemanticVerifier) or verifier.version != VERSION:
        raise ValueError("Unsupported semantic verifier artifact version")
    return verifier


def calibrated_decision(decision, reasons, prediction):
    if decision != "ALLOW" or prediction is None:
        return decision, reasons
    if prediction["prediction_set"] == [CONFORMANT]:
        return decision, ["Hard checks passed and calibrated set contains only conformant"]
    return "ESCALATE", ["Calibrated verifier did not produce a singleton conformant set"]
