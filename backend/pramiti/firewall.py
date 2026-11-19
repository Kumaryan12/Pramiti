from .catalog import ATTESTATIONS, CATALOG
from .compatibility import assess
from .domain import now, valid_signature


def verify(proposal, mandate, envelope, used, *, replay=False, catalogue=CATALOG, attestations=ATTESTATIONS):
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
    compatibility = assess(mandate, product, attestations) if mandate and product else None
    if mandate is not None and product is not None:
        changed_product = mandate.product_id is not None and mandate.product_id != product.id
        hard["substitution_policy"] = not changed_product or mandate.allow_substitutions
        hard["no_verified_spec_conflict"] = compatibility.status != "verified_incompatible"
        hard["required_evidence_policy"] = (
            mandate.missing_evidence != "reject" or not compatibility.missing
        )
    failures = [name for name, passed in hard.items() if not passed]
    if failures:
        return "REJECT", failures, hard, compatibility
    reasons = []
    if compatibility.status != "verified_compatible":
        reasons.append("Required product attributes lack independent evidence")
    if mandate.consent == "review":
        reasons.append("Signed mandate requires human approval")
    return (("ESCALATE", reasons, hard, compatibility) if reasons
            else ("ALLOW", ["All deterministic checks passed"], hard, compatibility))
