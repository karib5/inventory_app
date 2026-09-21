"""Lightweight, additive schema migrations for a project with no Alembic.

Every statement here must be safe to run on every backend startup: it can
only add a column that isn't there yet, never drop or rename anything and
never touch existing rows. Runs automatically alongside
Base.metadata.create_all() so pulling new model fields never requires a
manual "don't forget to run this" step - create_all only creates brand
new tables, it does not add columns to ones that already exist, which is
what this covers.
"""

from sqlalchemy import func, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

_ADD_COLUMN_STATEMENTS = [
    "ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS position_x INTEGER",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS position_y INTEGER",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS capacity INTEGER",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE",
]


def run_additive_migrations(engine: Engine) -> None:
    with engine.begin() as conn:
        for statement in _ADD_COLUMN_STATEMENTS:
            if engine.dialect.name == "postgresql":
                conn.execute(text(statement))
            else:
                # SQLite (local test runs only - production uses Postgres)
                # doesn't support "ADD COLUMN IF NOT EXISTS"; drop the
                # clause and just ignore a rerun hitting an existing column.
                try:
                    conn.execute(text(statement.replace(" IF NOT EXISTS", "")))
                except Exception:
                    pass


def reconcile_orphaned_location_stock(engine: Engine) -> None:
    """One-time, idempotent cleanup for stock rows left behind at a rack or
    shelf that was removed (Location.is_active set False) before the
    "remove" endpoint started refusing to deactivate a location that still
    holds stock. Every read path (warehouse/product stats, delete-history
    checks, a product's own stock breakdown) already filters those rows out
    by joining on Location.is_active, so a leftover ProductStock row here
    represents nothing the user can currently see anywhere in the app -
    this just deletes that inert bookkeeping row and recomputes the
    product's cached quantity to match, rather than leaving dead rows
    sitting around forever. Imported lazily (not at module import time) to
    avoid a circular import between app.db and app.models."""
    from app.models import Location, Product, ProductStock

    with Session(engine) as session:
        orphaned = session.scalars(
            select(ProductStock)
            .join(Location, Location.id == ProductStock.location_id)
            .where(Location.is_active.is_(False), ProductStock.quantity > 0)
        ).all()
        if not orphaned:
            return

        touched_product_ids = {row.product_id for row in orphaned}
        for row in orphaned:
            session.delete(row)
        session.flush()

        for product in session.scalars(select(Product).where(Product.id.in_(touched_product_ids))):
            product.quantity = (
                session.scalar(
                    select(func.coalesce(func.sum(ProductStock.quantity), 0))
                    .where(ProductStock.product_id == product.id)
                )
                or 0
            )
        session.commit()
