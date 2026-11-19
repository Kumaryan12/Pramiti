import pytest

from research.evaluate import METHODS, matched_review, wilson


def test_wilson_handles_empty_and_zero_event_samples():
    assert wilson(0, 0) is None
    assert wilson(0, 1000) == pytest.approx([0, 0.00382676])
    assert wilson(100, 100)[1] == 1


def test_matched_review_uses_identical_counts_and_preserves_rejections():
    rows = {}
    for i, method in enumerate(METHODS):
        rows[method] = [
            {"id": "unsafe", "truth": "nonconforming", "decision": "REJECT" if i else "ALLOW",
             "milliseconds": 1.0, "review_priority": 1},
            {"id": "legitimate-a", "truth": "conformant", "decision": "ALLOW",
             "milliseconds": 1.0, "review_priority": 0},
            {"id": "legitimate-b", "truth": "conformant", "decision": "ESCALATE" if i else "ALLOW",
             "milliseconds": 1.0, "review_priority": 0},
        ]
    points = matched_review(rows)
    assert points[0]["target_review_count"] == 1
    for point in points:
        assert {item["review_count"] for item in point["methods"].values()} == {point["target_review_count"]}
        assert all(point["methods"][method]["unsafe_approval_rate"] == 0 for method in METHODS[1:])


def test_fixture_supplies_provenance_separately_from_merchant_claim():
    from backend.pramiti.compatibility import assess, specifications
    from research.dataset import ambiguous_substitutes, create_split

    concealed = next(create_split("test", 1, 4, ("concealed_spec_gap",)))
    assert specifications(concealed.mandate.instruction) <= set(concealed.listing.requirements)
    assert concealed.inspection is None
    assert assess(concealed.mandate, concealed.listing, {}).status == "merchant_claim_only"
    alternate = next(ambiguous_substitutes(1, 4))
    assert alternate.inspection.product_id == alternate.listing.id
    assert assess(alternate.mandate, alternate.listing, {alternate.listing.id: alternate.inspection}).missing
