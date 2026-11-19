import hashlib
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query, Response
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from starlette.staticfiles import StaticFiles

from .agent import choose_product
from .catalog import CATALOG
from .domain import AgentRun, Mandate, Proposal, Review, SignedMandate, now, valid_signature
from .firewall import verify
from .semantic import calibrated_decision, load_verifier
from .storage import append_event, evidence, initialize, lock_ledger, mandates, open_database, payments

COOKIE = "pramiti_session"


def session_owner(session: Annotated[str | None, Cookie(alias=COOKIE)] = None):
    if not session or len(session) != 43:
        raise HTTPException(401, "Start a sandbox session first")
    return hashlib.sha256(session.encode()).hexdigest()


def fetch_mandate(connection, owner, mandate_id):
    return connection.execute(
        select(mandates).where(mandates.c.owner == owner, mandates.c.id == str(mandate_id))
    ).one_or_none()


def unpack(row):
    if row is None:
        return None, None
    try:
        envelope = SignedMandate.model_validate(row.envelope)
        return envelope, Mandate.model_validate_json(envelope.payload)
    except ValidationError:
        return None, None


def settle():
    return {"status": "SETTLED", "reference": "SIM-UPI-" + uuid4().hex.upper(), "rail": "synthetic UPI"}


def create_app(database_url=None):
    engine = open_database(database_url)

    @asynccontextmanager
    async def lifespan(_):
        initialize(engine)
        app.state.semantic = load_verifier(os.getenv("PRAMITI_MODEL_PATH"))
        try:
            yield
        finally:
            engine.dispose()

    app = FastAPI(title="PRAMITI", lifespan=lifespan)
    app.state.engine = engine
    Owner = Annotated[str, Depends(session_owner)]

    @app.get("/health")
    def health():
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "payments": "simulated"}

    @app.post("/api/session")
    def session(response: Response, existing: Annotated[str | None, Cookie(alias=COOKIE)] = None):
        if not existing or len(existing) != 43:
            response.set_cookie(COOKIE, secrets.token_urlsafe(32), httponly=True, samesite="strict",
                                secure=os.getenv("SECURE_COOKIES") == "1", max_age=30 * 86400)
        return {"llm_enabled": bool(os.getenv("OPENAI_API_KEY") and os.getenv("LLM_OPERATOR_TOKEN"))}

    @app.get("/api/catalogue")
    def catalogue():
        return [
            p.record() for p in CATALOG.values()
        ]

    @app.post("/api/mandates", status_code=201)
    def approve(envelope: SignedMandate, owner: Owner):
        if not valid_signature(envelope):
            raise HTTPException(422, "Invalid Ed25519 signature")
        try:
            mandate = Mandate.model_validate_json(envelope.payload)
        except ValidationError as exc:
            raise HTTPException(422, "Invalid signed mandate: " + exc.errors()[0]["msg"]) from exc
        if mandate.product_id and mandate.product_id not in CATALOG:
            raise HTTPException(422, "Expected product is not in the catalogue")
        key = str(mandate.id)
        try:
            with engine.begin() as connection:
                lock_ledger(connection, owner)
                connection.execute(mandates.insert().values(
                    id=key, owner=owner, envelope=envelope.model_dump(), reserved=0, spent=0
                ))
                append_event(connection, owner, "user_instruction", key, {"instruction": mandate.instruction})
                append_event(connection, owner, "mandate_approved", key, envelope.model_dump())
        except IntegrityError as exc:
            raise HTTPException(409, "Mandate identifier is already in use") from exc
        return mandate.model_dump(mode="json")

    @app.get("/api/mandates")
    def list_mandates(owner: Owner):
        with engine.connect() as connection:
            rows = connection.execute(select(mandates).where(mandates.c.owner == owner)).all()
        return [{**mandate.model_dump(mode="json"), "reserved": row.reserved, "spent": row.spent}
                for row in rows if (mandate := unpack(row)[1]) is not None]

    def submit(proposal, owner, source, rationale):
        payment_id = str(uuid4())
        nonce = str(proposal.nonce)
        mandate_id = str(proposal.mandate_id)
        with engine.begin() as connection:
            lock_ledger(connection, owner)
            row = fetch_mandate(connection, owner, mandate_id)
            envelope, mandate = unpack(row)
            previous = connection.execute(select(payments.c.id).where(
                payments.c.owner == owner, payments.c.nonce == nonce
            )).scalar_one_or_none()
            used = row.reserved + row.spent if row else 0
            decision, reasons, checks = verify(proposal, mandate, envelope, used, replay=previous is not None)
            prediction = None
            if decision != "REJECT" and app.state.semantic is not None:
                prediction = app.state.semantic.predict(mandate, proposal, CATALOG[proposal.product_id])
                decision, reasons = calibrated_decision(decision, reasons, prediction)
            record = {
                "id": payment_id, "created_at": now().isoformat(), "proposal": proposal.model_dump(mode="json"), "source": source,
                "rationale": rationale, "decision": decision, "reasons": reasons, "checks": checks,
                "status": "REJECTED", "settlement": None, "review": None, "semantic": prediction,
            }
            append_event(connection, owner, "agent_proposal", payment_id, {
                "proposal": record["proposal"], "source": source, "rationale": rationale,
            })
            append_event(connection, owner, "verification", payment_id, {
                "decision": decision, "checks": checks, "reasons": reasons, "semantic": prediction,
            })
            if previous:
                return record
            if decision == "ALLOW":
                record.update(status="SETTLED", settlement=settle())
                connection.execute(update(mandates).where(mandates.c.id == mandate_id)
                                   .values(spent=row.spent + proposal.amount))
                append_event(connection, owner, "simulated_settlement", payment_id, record["settlement"])
            elif decision == "ESCALATE":
                record["status"] = "PENDING"
                connection.execute(update(mandates).where(mandates.c.id == mandate_id)
                                   .values(reserved=row.reserved + proposal.amount))
            connection.execute(payments.insert().values(
                id=payment_id, owner=owner, nonce=nonce, status=record["status"], body=record,
            ))
        return record

    @app.post("/api/payments", status_code=201)
    def propose(proposal: Proposal, owner: Owner):
        return submit(proposal, owner, "manual", "Proposal submitted to the sandbox verifier.")

    @app.post("/api/agent/runs", status_code=201)
    def agent(run: AgentRun, owner: Owner, x_llm_token: Annotated[str, Header()] = ""):
        with engine.connect() as connection:
            envelope, mandate = unpack(fetch_mandate(connection, owner, run.mandate_id))
        if mandate is None:
            raise HTTPException(404, "Mandate unavailable")
        if not valid_signature(envelope):
            raise HTTPException(409, "Mandate integrity check failed")
        product, rationale = choose_product(run, mandate, x_llm_token)
        proposal = Proposal(mandate_id=run.mandate_id, nonce=uuid4(), product_id=product.id,
                            merchant=product.merchant, category=product.category, amount=product.amount)
        return submit(proposal, owner, run.mode, rationale)

    @app.get("/api/payments")
    def list_payments(owner: Owner):
        with engine.connect() as connection:
            rows = connection.execute(select(payments.c.body).where(payments.c.owner == owner)).scalars().all()
        return sorted(rows, key=lambda row: row.get("created_at", ""), reverse=True)

    @app.post("/api/payments/{payment_id}/review")
    def review(payment_id: str, review: Review, owner: Owner):
        with engine.begin() as connection:
            lock_ledger(connection, owner)
            payment = connection.execute(select(payments).where(
                payments.c.owner == owner, payments.c.id == payment_id
            )).one_or_none()
            if payment is None:
                raise HTTPException(404, "Payment unavailable")
            if payment.status != "PENDING":
                raise HTTPException(409, "Payment is no longer pending")
            record = payment.body
            proposal = Proposal.model_validate(record["proposal"])
            row = fetch_mandate(connection, owner, proposal.mandate_id)
            envelope, mandate = unpack(row)
            used = row.reserved + row.spent - proposal.amount if row else 0
            decision, reasons, checks = verify(proposal, mandate, envelope, used)
            approved = review.decision == "approve" and decision != "REJECT"
            record.update(
                status="SETTLED" if approved else "REJECTED",
                review={**review.model_dump(), "approved": approved, "hard_checks": checks,
                        "failed_checks": reasons if decision == "REJECT" else []},
                settlement=settle() if approved else None,
            )
            if row:
                connection.execute(update(mandates).where(mandates.c.id == row.id).values(
                    reserved=row.reserved - proposal.amount,
                    spent=row.spent + (proposal.amount if approved else 0),
                ))
            append_event(connection, owner, "human_review", payment_id, record["review"])
            if approved:
                append_event(connection, owner, "simulated_settlement", payment_id, record["settlement"])
            connection.execute(update(payments).where(payments.c.id == payment_id)
                               .values(status=record["status"], body=record))
        return record

    @app.get("/api/evidence")
    def ledger(owner: Owner, checkpoint: Annotated[str | None, Query(pattern=r"^[0-9a-f]{64}$")] = None):
        with engine.connect() as connection:
            return evidence(connection, owner, checkpoint)

    frontend = Path(os.getenv("FRONTEND_DIR", "frontend/dist"))
    if frontend.is_dir():
        app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")
    return app


app = create_app()
