"""Run two paid proposal-only calls against an explicitly configured local sandbox."""

import argparse
import base64
import os
from datetime import timedelta
from uuid import uuid4

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from backend.pramiti.domain import Mandate, now


def signed():
    mandate = Mandate(
        id=uuid4(), instruction="Buy the 65W USB-C charger with Power Delivery", max_amount=300000,
        cumulative_limit=600000, merchants=["Circuit House"], categories=["electronics"],
        product_id="assemble-65", requirements=["65w", "usb-c", "pd"], allow_substitutions=True,
        expires_at=now() + timedelta(hours=1), consent="automatic",
    )
    key = Ed25519PrivateKey.generate()
    payload = mandate.model_dump_json()
    return str(mandate.id), {
        "payload": payload, "public_key": base64.b64encode(key.public_key().public_bytes_raw()).decode(),
        "signature": base64.b64encode(key.sign(payload.encode())).decode(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    token = os.environ.get("LLM_OPERATOR_TOKEN")
    if not token:
        parser.error("LLM_OPERATOR_TOKEN is required")
    with httpx.Client(base_url=f"http://127.0.0.1:{args.port}", timeout=35) as client:
        def post(path, body, headers=None):
            response = client.post(path, json=body, headers=headers)
            response.raise_for_status()
            return response.json()

        if not post("/api/session", {})["llm_enabled"]:
            parser.error("The local sandbox has LLM mode disabled")
        for scenario in (None, "substitution"):
            for mode in ("scripted", "llm"):
                mandate_id, envelope = signed()
                post("/api/mandates", envelope)
                report = post("/api/agent/runs", {"mode": mode, "scenario": scenario, "mandate_id": mandate_id},
                              {"X-LLM-Token": token} if mode == "llm" else None)
                print(mode, scenario or "ordinary", report["proposal"]["product_id"], report["decision"],
                      report["compatibility"]["status"], report["id"])
        evidence = client.get("/api/evidence").raise_for_status().json()
        if not evidence["valid"]:
            raise SystemExit("Evidence verification failed")
        for entry in evidence["events"]:
            if entry["action"] == "agent_observations" and "tool_call" in entry["detail"]:
                print(entry["detail"]["model"], entry["detail"]["tool_call"])
        print("Verified evidence head", evidence["head"])


if __name__ == "__main__":
    main()
