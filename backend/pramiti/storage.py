import hashlib
import json
import os

from sqlalchemy import JSON, Column, Integer, MetaData, String, Table, UniqueConstraint, create_engine, event, select, text, update
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from .domain import now

metadata = MetaData()
heads = Table(
    "ledger_heads", metadata,
    Column("owner", String(64), primary_key=True),
    Column("position", Integer, nullable=False),
    Column("digest", String(64), nullable=False),
)
events = Table(
    "ledger_events", metadata,
    Column("owner", String(64), primary_key=True),
    Column("position", Integer, primary_key=True),
    Column("digest", String(64), nullable=False),
    Column("body", JSON, nullable=False),
)
mandates = Table(
    "mandates", metadata,
    Column("id", String(36), primary_key=True),
    Column("owner", String(64), nullable=False, index=True),
    Column("envelope", JSON, nullable=False),
    Column("reserved", Integer, nullable=False, default=0),
    Column("spent", Integer, nullable=False, default=0),
)
payments = Table(
    "payments", metadata,
    Column("id", String(36), primary_key=True),
    Column("owner", String(64), nullable=False, index=True),
    Column("nonce", String(36), nullable=False),
    Column("status", String(20), nullable=False),
    Column("body", JSON, nullable=False),
    UniqueConstraint("owner", "nonce"),
)
schema_revision = Table(
    "schema_revision", metadata,
    Column("id", Integer, primary_key=True),
    Column("version", Integer, nullable=False),
)
SCHEMA_VERSION = 1
GENESIS = "0" * 64


def open_database(url=None):
    url = url or os.getenv("DATABASE_URL", "sqlite:///./pramiti.db")
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            url = url.replace(prefix, "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    if os.getenv("PRAMITI_REQUIRE_POSTGRES") == "1" and engine.dialect.name != "postgresql":
        raise RuntimeError("This deployment requires a PostgreSQL DATABASE_URL")
    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def configure_sqlite(connection, _):
            connection.execute("PRAGMA busy_timeout=15000")
            connection.execute("PRAGMA journal_mode=WAL")
    return engine


def initialize(engine):
    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            connection.execute(text("SELECT pg_advisory_xact_lock(615405)"))
        elif connection.dialect.name == "sqlite":
            connection.exec_driver_sql("BEGIN IMMEDIATE")
        schema_revision.create(connection, checkfirst=True)
        version = connection.execute(select(schema_revision.c.version).where(schema_revision.c.id == 1)).scalar_one_or_none()
        if version is None:
            # Adopt the original schema without changing existing mandates, payments or evidence bytes.
            metadata.create_all(connection)
            connection.execute(schema_revision.insert().values(id=1, version=SCHEMA_VERSION))
        elif version != SCHEMA_VERSION:
            raise RuntimeError(f"Unsupported database schema revision {version}")


def lock_ledger(connection, owner):
    # INSERT obtains the SQLite write lock. On PostgreSQL UPDATE locks only this owner's head.
    insert = sqlite_insert if connection.dialect.name == "sqlite" else postgres_insert
    connection.execute(insert(heads).values(owner=owner, position=0, digest=GENESIS).on_conflict_do_nothing())
    connection.execute(update(heads).where(heads.c.owner == owner).values(position=heads.c.position))


def event_digest(body):
    canonical = json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def append_event(connection, owner, action, entity, detail):
    head = connection.execute(select(heads).where(heads.c.owner == owner)).one()
    position = head.position + 1
    body = {
        "ledger": owner, "position": position, "previous": head.digest,
        "at": now().isoformat(), "action": action, "entity": entity, "detail": detail,
    }
    digest = event_digest(body)
    connection.execute(events.insert().values(owner=owner, position=position, digest=digest, body=body))
    connection.execute(update(heads).where(heads.c.owner == owner).values(position=position, digest=digest))
    return {**body, "digest": digest}


def evidence(connection, owner, checkpoint=None):
    # Read the head first and stop at its position for a consistent view during concurrent appends.
    head = connection.execute(select(heads).where(heads.c.owner == owner)).one_or_none()
    position, digest = (head.position, head.digest) if head else (0, GENESIS)
    rows = connection.execute(
        select(events).where(events.c.owner == owner, events.c.position <= position).order_by(events.c.position)
    ).all()
    previous = GENESIS
    valid = len(rows) == position
    for expected, row in enumerate(rows, 1):
        body = row.body
        valid &= (
            row.position == expected == body.get("position")
            and body.get("ledger") == owner and body.get("previous") == previous
            and row.digest == event_digest(body)
        )
        previous = row.digest
    valid &= previous == digest
    return {
        "valid": valid, "head": digest, "count": len(rows),
        "checkpoint_found": None if checkpoint is None else valid and (
            checkpoint == GENESIS or any(row.digest == checkpoint for row in rows)
        ),
        "events": [{**row.body, "digest": row.digest} for row in rows],
    }
