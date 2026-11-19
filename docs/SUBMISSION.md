# PRAMITI · Proof of Intent for Agentic Finance

**One-line summary.** PRAMITI checks whether an AI agent’s proposed purchase matches the customer’s signed intent before allowing simulated settlement.

## Problem

A payment can satisfy a spending cap while buying the wrong product. The risk grows when an agent reads untrusted product listings and can accept merchant claims as evidence. Payment authorization should answer whether the transaction matches the customer's signed requirements and whether the available evidence supports that conclusion.

## Technical approach

A customer signs a structured mandate with a non-exportable browser-held Ed25519 key. A separate FastAPI service verifies the signature, merchant and category restrictions, per-payment and cumulative limits, replay protection and expiry. A SKU-bound, simulated inspection registry distinguishes corroborated product attributes from merchant claims. A verified contradiction blocks settlement, while uncertainty goes to review or rejection according to the customer’s signed policy. An optional gradient-boosting model uses class-conditional split conformal prediction as a second review gate. A hash-chained ledger records mandate, observations, proposed payment, checks, reviews and simulated settlement.

The React interface serves a public-safe overview, mandate builder, agent runner, verification view, review queue and evidence explorer. SQLite supports local operation and PostgreSQL backs the Render configuration.

## Verified synthetic evaluation

The 1,320-case evaluation used disjoint fixture IDs for training, calibration and testing. Native operating points measured unsafe approval from 1,000 unsafe cases and review from all 1,320 proposals. Basic signed amount authorization approved 900 unsafe proposals. The evidence-aware firewall, conventional ML and calibrated policies each approved zero (95% Wilson interval 0–0.38%). All 100 merchant-only concealed-specification cases escalated. At a matched 18.26% review budget, the three evidence-aware systems tied on unsafe and legitimate auto-approvals. Calibration did not add a demonstrated safety gain on this corpus. [Methodology, limits and frontier](RESEARCH.md)

## Financial-sector applications

The design could support controlled purchasing agents, corporate expense policies, brokered checkout or audit evidence for delegated payment authorizations. It supports simulated transactions and remains a research prototype.

## Limitations and roadmap

Evaluate with independently collected product data, product- and merchant-disjoint templates, and fixed protocol before testing. Integrate authenticated evidence providers, independent reviewer identities, fulfillment checks and an external checkpoint store. Validate live agent tool calls with synthetic catalogue content and track failures separately from scripted fixtures. Complete the Render rollout and incognito smoke test after workspace and private repository authorization. [Deployment steps](DEPLOYMENT.md)

The [public competition overview](https://pramiti-competition-overview.nitgoa2023.chatgpt.site/) is accessible without GitHub credentials. The app also serves the overview at `/overview.html`.
