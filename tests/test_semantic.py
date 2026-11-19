import math
from types import SimpleNamespace

import pytest

from backend.pramiti.semantic import CONFORMANT, NONCONFORMING, SemanticVerifier, calibrated_decision, threshold

from .test_payments import approve, client, proposal, submit


def test_finite_sample_rank_and_small_groups():
    assert threshold([0.3, 0.2, 0.1, 0.4], 0.4) == 0.3
    assert threshold([0.3, 0.2, 0.1, 0.4], 0.2) == 0.4
    assert math.isinf(threshold([0.3, 0.2, 0.1, 0.4], 0.19))
    assert math.isinf(threshold([], 0.1))
    with pytest.raises(ValueError):
        threshold([0.3], 1)


def test_class_conditional_sets_conserve_ties():
    verifier = SemanticVerifier(None, {CONFORMANT: [0.25] * 9, NONCONFORMING: [0.25] * 9})
    assert verifier.calibrate({CONFORMANT: 0.75, NONCONFORMING: 0.25})["prediction_set"] == [CONFORMANT]
    assert verifier.calibrate({CONFORMANT: 0.5, NONCONFORMING: 0.5})["prediction_set"] == []
    verifier.calibration[NONCONFORMING] = []
    assert verifier.calibrate({CONFORMANT: 0.75, NONCONFORMING: 0.25})["prediction_set"] == [CONFORMANT, NONCONFORMING]


@pytest.mark.parametrize("labels, decision", [
    ([CONFORMANT], "ALLOW"), ([], "ESCALATE"), ([NONCONFORMING], "ESCALATE"),
    ([CONFORMANT, NONCONFORMING], "ESCALATE"),
])
def test_singleton_conformant_gate(labels, decision):
    prediction = {"prediction_set": labels}
    assert calibrated_decision("ALLOW", [], prediction)[0] == decision
    assert calibrated_decision("REJECT", ["signature"], prediction) == ("REJECT", ["signature"])
    assert calibrated_decision("ESCALATE", ["unverified substitution"], prediction)[0] == "ESCALATE"


def test_runtime_calibrated_gate_records_prediction(client):
    client.app.state.semantic = SimpleNamespace(
        predict=lambda *_: {"prediction_set": [], "p_values": {}, "alpha": 0.1},
    )
    mandate = approve(client)
    result = submit(client, proposal(mandate))
    assert result["status"] == "PENDING"
    assert result["semantic"]["prediction_set"] == []
    result = submit(client, proposal(mandate, "travel-100"))
    assert result["decision"] == "REJECT"
    assert result["semantic"] is None
