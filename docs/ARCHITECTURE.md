# Architecture

The React app runs on the same origin as the FastAPI service. The browser persists a non-exportable demo Ed25519 private key in IndexedDB. It sends the exact signed UTF-8 JSON, public key, and signature. The service verifies the signed bytes before accepting a mandate and again when verifying a payment or approving a review. Mandates have no edit endpoint. The shopping agent returns a catalogue identifier, while the server takes the authoritative amount, category, and merchant from the catalogue.

FastAPI issues a random bearer session in an HttpOnly, SameSite=Strict cookie. The database stores its SHA-256 digest as the owner identifier. Mandates, proposals, reviews and evidence are session-scoped. Because this is a single-operator sandbox, human review is performed within the same browser account. Use synthetic inputs.

Every owner write takes the evidence head lock first. SQLite serializes writes and PostgreSQL locks the owner’s row. A single transaction covers the nonce decision, reservation or spending update, payment status and evidence append. A database uniqueness constraint backs nonce checking. Review releases the reservation and rechecks hard policy before settlement. Pending items hold their reservation until reviewed. Clearing browser data removes local access to the session.

The evidence chain hashes canonical UTF-8 JSON with sorted keys. Each entry commits to the prior digest, order, owner, timestamp, action and event data. Verification compares the entries, stored head and optional trusted checkpoint. Keep trusted checkpoints outside the database. Hash chaining cannot establish whether the original inputs were true.
