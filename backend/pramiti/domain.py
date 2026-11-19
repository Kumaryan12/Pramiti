import base64
import binascii
from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


def now():
    return datetime.now(timezone.utc)


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Mandate(Input):
    id: UUID
    instruction: Annotated[str, StringConstraints(min_length=1, max_length=2000)]
    max_amount: Annotated[int, Field(strict=True, gt=0, le=100_000_000)]
    cumulative_limit: Annotated[int, Field(strict=True, gt=0, le=100_000_000)]
    merchants: Annotated[list[ShortText], Field(min_length=1, max_length=20)]
    categories: Annotated[list[ShortText], Field(min_length=1, max_length=20)]
    product_id: ShortText | None = None
    requirements: Annotated[list[ShortText], Field(max_length=20)]
    allow_substitutions: bool
    missing_evidence: Literal["review", "reject"] = "review"
    expires_at: datetime
    consent: Literal["automatic", "review"]

    @model_validator(mode="after")
    def validate_policy(self):
        if self.expires_at.utcoffset() is None:
            raise ValueError("Expiry must include a timezone")
        if not self.instruction.strip():
            raise ValueError("Shopping instruction is required")
        if self.product_id is None and not self.requirements:
            raise ValueError("Choose an expected product or provide product requirements")
        return self


class SignedMandate(Input):
    payload: str = Field(min_length=2, max_length=12000)
    public_key: str = Field(max_length=64)
    signature: str = Field(max_length=128)


class Proposal(Input):
    mandate_id: UUID
    nonce: UUID
    product_id: ShortText
    merchant: ShortText
    category: ShortText
    amount: Annotated[int, Field(strict=True, gt=0, le=100_000_000)]


class AgentRun(Input):
    mandate_id: UUID
    mode: Literal["scripted", "llm"] = "scripted"
    scenario: Literal["legitimate", "over_budget", "substitution"] | None = None


class Review(Input):
    decision: Literal["approve", "reject"]
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] = ""


def valid_signature(envelope: SignedMandate) -> bool:
    try:
        key = Ed25519PublicKey.from_public_bytes(base64.b64decode(envelope.public_key, validate=True))
        key.verify(base64.b64decode(envelope.signature, validate=True), envelope.payload.encode("utf-8"))
        return True
    except (ValueError, InvalidSignature, binascii.Error):
        return False
