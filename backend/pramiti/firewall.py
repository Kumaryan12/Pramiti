from .catalog import CATALOG
from .domain import now, valid_signature


def verify(proposal, mandate, envelope, used, *, replay=False, catalogue=CATALOG):
    product = catalogue.get(proposal.product_id)
    hard = {
        "signature": envelope is not None and valid_signature(envelope),
        "mandate_integrity": mandate is not None and mandate.id == proposal.mandate_id,
        "nonce_unique": not replay,
        "catalog_integrity": product is not None and (product.amount, product.merchant, product.category)
        == (proposal.amount, proposal.merchant, proposal.category),
        "mandate_current": mandate is not None and mandate.expires_at > now(),
        "single_payment_limit": mandate is not None and proposal.amount <= mandate.max_amount,
        "permitted_merchant": mandate is not None and proposal.merchant in mandate.merchants,
        "permitted_category": mandate is not None and proposal.category in mandate.categories,
        "cumulative_limit": mandate is not None and used + proposal.amount <= mandate.cumulative_limit,
    }
    mismatch = bool(mandate and product and (
        (mandate.product_id is not None and mandate.product_id != product.id)
        or not {item.casefold() for item in mandate.requirements}.issubset(product.requirements)
    ))
    if mandate is not None:
        hard["substitution_policy"] = not mismatch or mandate.allow_substitutions
    failures = [name for name, passed in hard.items() if not passed]
    if failures:
        return "REJECT", failures, hard
    reasons = []
    if mismatch:
        reasons.append("Unverified product substitution (deterministic check)")
    if mandate.consent == "review":
        reasons.append("Signed mandate requires human approval")
    return ("ESCALATE", reasons, hard) if reasons else ("ALLOW", ["All deterministic checks passed"], hard)
