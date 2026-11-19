from dataclasses import asdict, dataclass
import re

from .catalog import ATTESTATIONS

MEASUREMENT = re.compile(r"\b(\d+(?:\.\d+)?)\s*(w|ml|gb|in|mm|-key)\b", re.IGNORECASE)
PAPER = re.compile(r"\ba[3-7]\b", re.IGNORECASE)
MATERIALS = {"aluminium", "plastic"}


def normalize(value):
    value = value.strip().casefold()
    return MEASUREMENT.sub(r"\1\2", value)


def specifications(text):
    return {normalize(match[0]) for match in MEASUREMENT.finditer(text)} | {
        match[0].casefold() for match in PAPER.finditer(text)
    }


def slot(value):
    if match := MEASUREMENT.fullmatch(value):
        return match[2].casefold()
    if PAPER.fullmatch(value):
        return "paper_size"
    if value in MATERIALS:
        return "material"
    return None


@dataclass(frozen=True)
class Compatibility:
    status: str
    required: tuple[str, ...]
    confirmed: tuple[str, ...]
    contradictions: tuple[str, ...]
    missing: tuple[str, ...]
    merchant_only: tuple[str, ...]
    evidence_reference: str | None

    def record(self):
        return asdict(self)


def assess(mandate, product, attestations=ATTESTATIONS):
    """Merchant content can explain a review, but only a SKU-bound record supplies evidence."""
    required = {normalize(value) for value in mandate.requirements} | specifications(mandate.instruction)
    attestation = attestations.get(product.id)
    if attestation and attestation.product_id != product.id:
        attestation = None
    verified = {normalize(value) for value in attestation.attributes} if attestation else set()
    claims = {normalize(value) for value in product.requirements} | specifications(product.title + " " + product.description)
    conflicts = {
        expectation for expectation in required if slot(expectation) is not None
        and any(slot(value) == slot(expectation) and value != expectation for value in verified)
    }
    confirmed = (required & verified) - conflicts
    missing = required - confirmed - conflicts
    if not required and (not attestation or mandate.product_id != product.id):
        missing.add("authorized product identity")
    merchant_only = missing & claims
    status = (
        "verified_incompatible" if conflicts else "merchant_claim_only" if merchant_only
        else "insufficient_evidence" if missing else "verified_compatible"
    )
    return Compatibility(status, tuple(sorted(required)), tuple(sorted(confirmed)), tuple(sorted(conflicts)),
                         tuple(sorted(missing)), tuple(sorted(merchant_only)),
                         attestation.reference if attestation else None)
