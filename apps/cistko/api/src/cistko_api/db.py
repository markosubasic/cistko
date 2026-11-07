"""Database models and session factory for Čistko."""

from __future__ import annotations

from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Float, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column, sessionmaker

from cistko_api.settings import CistkoSettings
from opendata_core.db import Base, make_engine


class Municipality(Base):
    """A city or municipality (JLS) with its separate-collection rates."""

    __tablename__ = "municipality"

    mb: Mapped[str] = mapped_column(String(8), primary_key=True)  # jls_mb
    name: Mapped[str] = mapped_column(Text, index=True)  # jls_ime (upper case in the source)
    kind: Mapped[str] = mapped_column(String(4))  # GR | OP
    county: Mapped[str] = mapped_column(Text, index=True)
    county_rb: Mapped[str] = mapped_column(String(4))
    sep_2022: Mapped[float | None] = mapped_column(Float, nullable=True)  # %
    sep_2019: Mapped[float | None] = mapped_column(Float, nullable=True)  # %
    waste_2019_t: Mapped[float | None] = mapped_column(Float, nullable=True)
    mixed_2019_t: Mapped[float | None] = mapped_column(Float, nullable=True)
    separated_2019_t: Mapped[float | None] = mapped_column(Float, nullable=True)
    geom: Mapped[Any] = mapped_column(Geometry("MULTIPOLYGON", srid=4326, spatial_index=True))
    geom_simple: Mapped[Any] = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)


class County(Base):
    """A county with its municipal-waste recycling rate."""

    __tablename__ = "county"

    rb: Mapped[str] = mapped_column(String(4), primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    recycling_2022: Mapped[float | None] = mapped_column(Float, nullable=True)  # %
    geom_simple: Mapped[Any] = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)


class DumpSite(Base):
    """A location of illegally dumped waste from the Ministry's register (ELOO)."""

    __tablename__ = "dump_site"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # odbaceni_otpad_id
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    settlement: Mapped[str | None] = mapped_column(Text, nullable=True)
    municipality_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    mb: Mapped[str | None] = mapped_column(String(8), index=True, nullable=True)
    waste_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(16), index=True)
    qty_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume_m3: Mapped[float | None] = mapped_column(Float, nullable=True)
    area_m2: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(12), index=True)  # on_site | reported | removed
    photos: Mapped[Any] = mapped_column(JSONB, default=list)
    geom: Mapped[Any] = mapped_column(Geometry("POINT", srid=4326, spatial_index=True))


class Facility(Base):
    """Recycling yard, landfill, sorting plant, waste centre, composting plant or a dump in a cave."""

    __tablename__ = "facility"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(16), index=True)
    year: Mapped[int] = mapped_column(SmallInteger)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    operator: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    info: Mapped[Any] = mapped_column(JSONB, default=dict)
    mb: Mapped[str | None] = mapped_column(String(8), index=True, nullable=True)
    geom: Mapped[Any] = mapped_column(Geometry("POINT", srid=4326, spatial_index=True))


def make_session_factory(settings: CistkoSettings) -> sessionmaker[Session]:
    """Session factory bound to ``settings.database_url``."""
    return sessionmaker(make_engine(settings), expire_on_commit=False)
