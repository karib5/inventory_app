"""Lightweight, additive schema migrations for a project with no Alembic.

Every statement here must be safe to run on every backend startup: it can
only add a column that isn't there yet, never drop or rename anything and
never touch existing rows. Runs automatically alongside
Base.metadata.create_all() so pulling new model fields never requires a
manual "don't forget to run this" step - create_all only creates brand
new tables, it does not add columns to ones that already exist, which is
what this covers.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

_ADD_COLUMN_STATEMENTS = [
    "ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS position_x INTEGER",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS position_y INTEGER",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS capacity INTEGER",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
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
