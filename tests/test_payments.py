import base64
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4

import httpx
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, update

from backend.pramiti.catalog import CATALOG
from backend.pramiti.domain import now
from backend.pramiti.main import COOKIE, create_app
from backend.pramiti.storage import events, heads, mandates, payments


@pytest.fixture
def client(tmp_path):
    url = os.getenv("PRAMITI_TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'test.db'}"
    app = create_app(url)
    with TestClient(app) as client:
        if os.getenv("PRAMITI_TEST_DATABASE_URL"):
            with app.state.engine.begin() as connection:
                for table in (events, payments, mandates, heads):
                    connection.execute(delete(table))
        assert client.post("/api/session").status_code == 200
        yield client


def signed(**overrides):
    policy = {
        "id": str(uuid4()), "instruction": "Buy the 65W USB-C charger with Power Delivery",
        "max_amount": 300000, "cumulative_limit": 480000, "merchants": ["Circuit House"],
        "categories": ["electronics"], "product_id": "assemble-65", "requirements": ["65w", "usb-c", "pd"],
        "allow_substitutions": True, "expires_at": (now() + timedelta(hours=1)).isoformat(), "consent": "automatic",
        **overrides,
    }
    payload = json.dumps(policy, ensure_ascii=False)
    private_key = Ed25519PrivateKey.generate()
    envelope = {
        "payload": payload, "public_key": base64.b64encode(private_key.public_key().public_bytes_raw()).decode(),
        "signature": base64.b64encode(private_key.sign(payload.encode())).decode(),
    }
    return policy["id"], envelope


def approve(client, **overrides):
    mandate_id, envelope = signed(**overrides)
    assert client.post("/api/mandates", json=envelope).status_code == 201
    return mandate_id


def proposal(mandate_id, sku="assemble-65"):
    product = CATALOG[sku]
    return {"mandate_id": mandate_id, "nonce": str(uuid4()), "product_id": sku,
            "merchant": product.merchant, "category": product.category, "amount": product.amount}


def submit(client, body):
    response = client.post("/api/payments", json=body)
    assert response.status_code == 201
    return response.json()


def test_signature_and_tampering(client):
    _, envelope = signed(instruction="प्रमिति · 65W")
    original = envelope.copy()
    envelope["payload"] = envelope["payload"].replace("65W", "20W")
    assert client.post("/api/mandates", json=envelope).status_code == 422
    assert client.post("/api/mandates", json=original).status_code == 201
    assert client.post("/api/mandates", json=original).status_code == 409


@pytest.mark.parametrize(("scenario", "decision", "expected"), [
    ("legitimate", "ALLOW", "assemble-65"),
    ("over_budget", "REJECT", "travel-100"),
    ("substitution", "ESCALATE", "compact-20"),
])
def test_scripted_paths(client, scenario, decision, expected):
    mandate_id = approve(client)
    response = client.post("/api/agent/runs", json={"mandate_id": mandate_id, "scenario": scenario})
    assert response.status_code == 201
    result = response.json()
    assert (result["decision"], result["proposal"]["product_id"], result["source"]) == (decision, expected, "scripted")


def test_limit_expiry_and_replay(client):
    mandate_id = approve(client, cumulative_limit=239900)
    request = proposal(mandate_id)
    assert submit(client, request)["status"] == "SETTLED"
    assert "nonce_unique" in submit(client, request)["reasons"]
    assert "cumulative_limit" in submit(client, proposal(mandate_id))["reasons"]
    expired = approve(client, expires_at=(now() - timedelta(seconds=1)).isoformat())
    assert "mandate_current" in submit(client, proposal(expired))["reasons"]


def test_catalog_merchant_category_and_substitution(client):
    mandate_id = approve(client, allow_substitutions=False)
    assert "substitution_policy" in submit(client, proposal(mandate_id, "compact-20"))["reasons"]
    request = proposal(mandate_id)
    request.update(merchant="Fabricated Merchant", category="accessories")
    checks = submit(client, request)["checks"]
    assert not checks["catalog_integrity"]
    assert not checks["permitted_merchant"]
    assert not checks["permitted_category"]


@pytest.mark.parametrize("review", ["approve", "reject"])
def test_review_releases_reservation(client, review):
    mandate_id = approve(client, cumulative_limit=239900, consent="review")
    pending = submit(client, proposal(mandate_id))
    assert pending["status"] == "PENDING"
    assert submit(client, proposal(mandate_id))["status"] == "REJECTED"
    url = f'/api/payments/{pending["id"]}/review'
    result = client.post(url, json={"decision": review}).json()
    assert result["status"] == ("SETTLED" if review == "approve" else "REJECTED")
    row = client.get("/api/mandates").json()[0]
    assert row["reserved"] == 0
    assert row["spent"] == (239900 if review == "approve" else 0)
    assert client.post(url, json={"decision": "approve"}).status_code == 409


def test_review_cannot_bypass_tampered_mandate(client):
    mandate_id = approve(client, consent="review")
    pending = submit(client, proposal(mandate_id))
    with client.app.state.engine.begin() as connection:
        envelope = connection.execute(select(mandates.c.envelope)).scalar_one()
        envelope["payload"] = envelope["payload"].replace("Buy", "Sell")
        connection.execute(update(mandates).values(envelope=envelope))
    result = client.post(f'/api/payments/{pending["id"]}/review', json={"decision": "approve"}).json()
    assert result["status"] == "REJECTED"
    assert "signature" in result["review"]["failed_checks"]


def test_concurrent_reservations(client):
    mandate_id = approve(client, cumulative_limit=239900, consent="review")
    barrier = Barrier(8)

    def attempt(_):
        barrier.wait(timeout=10)
        return submit(client, proposal(mandate_id))["status"]

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(attempt, range(8)))
    assert outcomes.count("PENDING") == 1
    assert outcomes.count("REJECTED") == 7
    assert client.get("/api/evidence").json()["valid"]


def test_ledger_and_session_isolation(client):
    mandate_id = approve(client)
    first = client.get("/api/evidence").json()
    submit(client, proposal(mandate_id))
    verified = client.get("/api/evidence", params={"checkpoint": first["head"]}).json()
    assert (verified["valid"], verified["checkpoint_found"], verified["count"]) == (True, True, 5)
    cookie = client.cookies.pop(COOKIE)
    assert client.get("/api/evidence").status_code == 401
    client.post("/api/session")
    assert client.get("/api/evidence").json()["count"] == 0
    assert client.get("/api/mandates").json() == []
    client.cookies.set(COOKIE, cookie)
    with client.app.state.engine.begin() as connection:
        row = connection.execute(select(events).where(events.c.position == 1)).one()
        connection.execute(update(events).where(events.c.position == 1)
                           .values(body={**row.body, "detail": {"instruction": "modified"}}))
    assert not client.get("/api/evidence").json()["valid"]


def test_llm_mode_requires_operator_token(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "synthetic-test-key")
    monkeypatch.setenv("LLM_OPERATOR_TOKEN", "test-operator-token")
    request = {"mandate_id": approve(client), "mode": "llm"}
    assert client.post("/api/agent/runs", json=request).status_code == 403


def test_concurrent_duplicate_nonce_and_split_total(client):
    mandate_id = approve(client, cumulative_limit=300000)
    same_request = proposal(mandate_id)
    barrier = Barrier(4)

    def attempt(_):
        barrier.wait(timeout=10)
        return submit(client, same_request)

    with ThreadPoolExecutor(max_workers=4) as pool:
        outcomes = list(pool.map(attempt, range(4)))
    assert sum(row["status"] == "SETTLED" for row in outcomes) == 1
    assert sum(not row["checks"]["nonce_unique"] for row in outcomes) == 3
    split = submit(client, proposal(mandate_id, "compact-20"))
    assert not split["checks"]["cumulative_limit"]
    assert split["checks"]["single_payment_limit"]
    assert client.get("/api/mandates").json()[0]["spent"] == 239900


def test_llm_selection_uses_server_catalogue(client, monkeypatch):
    def response(url, *, headers, json, timeout):
        assert url == "https://api.openai.com/v1/chat/completions"
        assert "mandate" in json["messages"][1]["content"]
        assert timeout > 0
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "choices": [{"message": {
                "content": '{"product_id":"compact-20","rationale":"Merchant recommendation","amount":5}',
            }}],
        })

    monkeypatch.setenv("OPENAI_API_KEY", "synthetic-test-key")
    monkeypatch.setenv("LLM_OPERATOR_TOKEN", "test-operator-token")
    monkeypatch.setattr("backend.pramiti.agent.httpx.post", response)
    mandate_id = approve(client)
    result = client.post("/api/agent/runs", json={"mandate_id": mandate_id, "mode": "llm"},
                         headers={"X-LLM-Token": "test-operator-token"})
    assert result.status_code == 201
    body = result.json()
    assert body["source"] == "llm"
    assert body["proposal"]["amount"] == CATALOG["compact-20"].amount
    assert body["decision"] == "ESCALATE"


def test_schema_revision_adopts_existing_data(client):
    from backend.pramiti.storage import initialize, schema_revision

    mandate_id = approve(client)
    assert submit(client, proposal(mandate_id))["status"] == "SETTLED"
    before = client.get("/api/evidence").json()
    engine = client.app.state.engine
    with engine.begin() as connection:
        connection.execute(delete(schema_revision))
    initialize(engine)
    initialize(engine)
    assert client.get("/api/evidence").json() == before


def test_production_requires_postgres(tmp_path, monkeypatch):
    monkeypatch.setenv("PRAMITI_REQUIRE_POSTGRES", "1")
    with pytest.raises(RuntimeError, match="requires a PostgreSQL"):
        create_app(f"sqlite:///{tmp_path / 'production.db'}")


def test_merchant_claim_escalates_even_with_singleton_model(client):
    from types import SimpleNamespace

    client.app.state.semantic = SimpleNamespace(
        predict=lambda *_: {"prediction_set": ["conformant"], "p_values": {"conformant": 1}},
    )
    # 65 W is expressed only in the signed instruction, with a space before the unit.
    mandate_id = approve(client, instruction="Buy the 65 W charger", requirements=["usb-c"], product_id=None)
    payment = submit(client, proposal(mandate_id, "compact-20"))
    assert payment["decision"] == "ESCALATE"
    assert payment["compatibility"]["status"] == "merchant_claim_only"
    assert payment["compatibility"]["missing"] == ["65w"]
    assert payment["compatibility"]["confirmed"] == ["usb-c"]
    assert all(payment["checks"].values())
    route = f'/api/payments/{payment["id"]}/review'
    assert client.post(route, json={"decision": "approve"}).status_code == 422
    assert client.post(route, json={"decision": "approve", "note": "Independent specification inspected."}).json()["status"] == "SETTLED"


def test_missing_evidence_can_be_a_signed_rejection(client):
    mandate_id = approve(client, missing_evidence="reject")
    payment = submit(client, proposal(mandate_id, "compact-20"))
    assert payment["status"] == "REJECTED"
    assert not payment["checks"]["required_evidence_policy"]
    assert client.post(f'/api/payments/{payment["id"]}/review', json={"decision": "approve"}).status_code == 409


def test_trusted_conflict_cannot_be_overridden(client):
    mandate_id = approve(client, max_amount=600000, cumulative_limit=600000)
    payment = submit(client, proposal(mandate_id, "travel-100"))
    assert payment["compatibility"]["status"] == "verified_incompatible"
    assert payment["compatibility"]["contradictions"] == ["65w"]
    assert payment["decision"] == "REJECT"


def test_missing_claim_is_insufficient_evidence(client):
    mandate_id = approve(client, instruction="Buy a waterproof charger", requirements=["waterproof"])
    payment = submit(client, proposal(mandate_id))
    assert payment["compatibility"]["status"] == "insufficient_evidence"
    assert payment["decision"] == "ESCALATE"


def test_attestation_cannot_be_reused_across_skus(client, monkeypatch):
    from backend.pramiti.catalog import ATTESTATIONS

    monkeypatch.setitem(ATTESTATIONS, "compact-20", ATTESTATIONS["assemble-65"])
    payment = submit(client, proposal(approve(client), "compact-20"))
    assert payment["decision"] == "ESCALATE"
    assert payment["compatibility"]["evidence_reference"] is None
