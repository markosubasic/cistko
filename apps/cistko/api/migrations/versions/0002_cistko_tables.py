"""Čistko tables: municipality, county, dump_site, facility

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"


def _gist(table: str, column: str = "geom") -> None:
    op.create_index(f"idx_{table}_{column}", table, [column], postgresql_using="gist")


def upgrade() -> None:
    op.create_table(
        "municipality",
        sa.Column("mb", sa.String(8), primary_key=True),
        sa.Column("name", sa.Text, nullable=False, index=True),
        sa.Column("kind", sa.String(4), nullable=False),
        sa.Column("county", sa.Text, nullable=False, index=True),
        sa.Column("county_rb", sa.String(4), nullable=False),
        sa.Column("sep_2022", sa.Float),
        sa.Column("sep_2019", sa.Float),
        sa.Column("waste_2019_t", sa.Float),
        sa.Column("mixed_2019_t", sa.Float),
        sa.Column("separated_2019_t", sa.Float),
        sa.Column("geom", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False),
        sa.Column("geom_simple", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False)),
    )
    _gist("municipality")
    op.create_table(
        "county",
        sa.Column("rb", sa.String(4), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("recycling_2022", sa.Float),
        sa.Column("geom_simple", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False)),
    )
    op.create_table(
        "dump_site",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=False),
        sa.Column("name", sa.Text),
        sa.Column("description", sa.Text),
        sa.Column("settlement", sa.Text),
        sa.Column("municipality_label", sa.Text),
        sa.Column("mb", sa.String(8), index=True),
        sa.Column("waste_type", sa.Text),
        sa.Column("category", sa.String(16), nullable=False, index=True),
        sa.Column("qty_kg", sa.Float),
        sa.Column("volume_m3", sa.Float),
        sa.Column("area_m2", sa.Float),
        sa.Column("status", sa.String(12), nullable=False, index=True),
        sa.Column("photos", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("geom", Geometry("POINT", srid=4326, spatial_index=False), nullable=False),
    )
    _gist("dump_site")
    op.create_table(
        "facility",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("kind", sa.String(16), nullable=False, index=True),
        sa.Column("year", sa.SmallInteger, nullable=False),
        sa.Column("name", sa.Text),
        sa.Column("operator", sa.Text),
        sa.Column("address", sa.Text),
        sa.Column("status", sa.Text),
        sa.Column("url", sa.Text),
        sa.Column("info", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("mb", sa.String(8), index=True),
        sa.Column("geom", Geometry("POINT", srid=4326, spatial_index=False), nullable=False),
    )
    _gist("facility")


def downgrade() -> None:
    for table in ("facility", "dump_site", "county", "municipality"):
        op.drop_table(table)
