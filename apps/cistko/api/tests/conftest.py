"""Shared fixtures: REAL responses of the waste-management WFS recorded on 2026-11-07."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    skip_live = pytest.mark.skip(reason="live network test: set RUN_LIVE=1")
    skip_db = pytest.mark.skip(reason="needs PostGIS: set TEST_DATABASE_URL")
    for item in items:
        if "live" in item.keywords and os.environ.get("RUN_LIVE") != "1":
            item.add_marker(skip_live)
        if "db" in item.keywords and not os.environ.get("TEST_DATABASE_URL"):
            item.add_marker(skip_db)


def load(name: str) -> dict[str, Any]:
    """A recorded GeoJSON response."""
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def dumps() -> list[dict[str, Any]]:
    """First 400 records of otpad:odbaceni_otpad (ELOO register), recorded 2026-11-07."""
    return [f["properties"] for f in load("2026-11-07_odbaceni_otpad_first400.json")["features"]]


@pytest.fixture(scope="session")
def capabilities() -> str:
    """GetCapabilities of https://servisi.azo.hr/otpad/wfs, recorded 2026-11-07."""
    path = (
        Path(__file__).parents[2]
        / "data"
        / "evidence"
        / "2026-11-07_azo_otpad_wfs_GetCapabilities.xml"
    )
    return path.read_text(encoding="utf-8")
