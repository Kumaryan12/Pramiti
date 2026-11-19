import re
from dataclasses import asdict, dataclass

from .catalog import ATTESTATIONS

MEASUREMENT = re.compile(r"\b(\d+(?:\.\d+)?)\s*(w|ml|gb|in|mm|-key)\b", re.IGNORECASE)
PAPER = re.compile(r"\ba[3-7]\b", re.IGNORECASE)
MATERIALS = {"aluminium", "plastic"}
QUALIFIER = re.compile(r"\b(?:not|avoid|without|except|or|at least|at most|up to|minimum|maximum)\b", re.IGNORECASE)


def normalize(value):
    value = value.strip().casefold().replace("aluminum", "aluminium")
    return MEASUREMENT.sub(r"\1\2", value)


def specifications(text):
    text = normalize(text)
    materials = MATERIALS.intersection(re.findall(r"\b\w+\b", text))
    return materials | {normalize(match[0]) for match in MEASUREMENT.finditer(text)} | {
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
    instruction = normalize(mandate.instruction)
    instruction_constraints = specifications(instruction)
    qualified = bool(instruction_constraints and QUALIFIER.search(instruction))
    required = {normalize(value) for value in mandate.requirements}
    if not qualified:
        required |= instruction_constraints
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
    if qualified:
        missing.add("qualified instruction requires review")
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
