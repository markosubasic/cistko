"""HTTP API of Čistko (all routes under /api/v1)."""

from __future__ import annotations

import re
import threading
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from cistko_api import stats
from cistko_api.constants import (
    ELOO_PUBLIC_URL,
    EU_DIRECTIVE_URL,
    EU_RECYCLING_TARGETS,
    FACILITY_LABELS,
    FACILITY_LAYERS,
    STATUS_LABELS,
    WASTE_CKAN_URL,
)
from cistko_api.settings import CistkoSettings
from opendata_core import geocode as core_geocode
from opendata_core.geo import in_croatia

Lat = Annotated[float, Query(description="WGS84 latitude")]
Lon = Annotated[float, Query(description="WGS84 longitude")]
Status = Literal["on_site", "reported", "removed"]

ATTRIBUTION = (
    "Ministarstvo zaštite okoliša i energetike, Gospodarenje otpadom (Portal otvorenih podataka)"
)


def geocode_title(result: dict[str, Any]) -> str:
    """Short title of a Nominatim result: "Ilica 200", else the place name."""
    address = result.get("address") or {}
    road = next(
        (address[k] for k in ("road", "pedestrian", "footway", "path") if address.get(k)), None
    )
    if road:
        number = address.get("house_number")
        return f"{road} {number}" if number else str(road)
    return str(result.get("name") or str(result.get("display_name", "")).split(",")[0].strip())


class _Cache:
    """Process-wide cache of slow, data-derived responses (the data changes only on re-ingest)."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._lock = threading.Lock()

    def get(self, key: str, build: Callable[[], Any]) -> Any:
        with self._lock:
            if key not in self._data:
                self._data[key] = build()
            return self._data[key]


def make_router(get_session: Callable[..., Any], settings: CistkoSettings) -> APIRouter:
    """Routes bound to the settings."""
    router = APIRouter(prefix="/api/v1")
    cache = _Cache()

    @router.get("/geocode")
    def geocode(
        q: Annotated[str, Query(min_length=3, max_length=120)],
        session: Session = Depends(get_session),  # noqa: B008
    ) -> dict[str, Any]:
        """Address search anywhere in Croatia (OpenStreetMap Nominatim, cached 30 days)."""
        try:
            result = core_geocode.search(session, q, settings=settings)
        except Exception as exc:
            raise HTTPException(502, "Usluga za pretragu adresa trenutno nije dostupna.") from exc
        items: list[dict[str, Any]] = []
        seen: set[tuple[str, float, float]] = set()
        for r in result.results:
            item = {
                "label": r.get("display_name", ""),
                "title": geocode_title(r),
                "lat": float(r["lat"]),
                "lon": float(r["lon"]),
                "type": r.get("type"),
            }
            key = (item["title"], round(item["lat"], 4), round(item["lon"], 4))
            if key not in seen:
                seen.add(key)
                items.append(item)
        return {"results": items, "attribution": result.attribution, "cached": result.from_cache}

    @router.get("/overview")
    def overview(session: Session = Depends(get_session)) -> dict[str, Any]:  # noqa: B008
        """National numbers: dump sites by status, separation rates, counties, facilities."""
        return cache.get("overview", lambda: stats.overview(session))

    @router.get("/municipalities")
    def municipalities(
        q: Annotated[str, Query(min_length=2, max_length=80)],
        session: Session = Depends(get_session),  # noqa: B008
    ) -> dict[str, Any]:
        """Municipality search by name."""
        return {"results": stats.search(session, q)}

    @router.get("/municipalities.geojson")
    def municipalities_geojson(session: Session = Depends(get_session)) -> dict[str, Any]:  # noqa: B008
        """Simplified outlines of all 556 municipalities with rates and dump-site counts."""
        return cache.get("geojson", lambda: stats.municipalities_geojson(session))

    @router.get("/municipalities/{mb}")
    def municipality(mb: str, session: Session = Depends(get_session)) -> dict[str, Any]:  # noqa: B008
        """Municipality card: separation rates, rank, dump sites, facilities, neighbours."""
        if not re.fullmatch(r"\d{3,8}", mb):
            raise HTTPException(422, "Neispravna šifra općine.")
        card = stats.municipality_card(session, mb)
        if card is None:
            raise HTTPException(404, "Nepoznata općina ili grad.")
        return card

    @router.get("/league")
    def league(
        county: Annotated[str | None, Query(max_length=60)] = None,
        session: Session = Depends(get_session),  # noqa: B008
    ) -> dict[str, Any]:
        """All municipalities ranked by the 2022 separation rate (optionally within a county)."""
        rows = cache.get("league", lambda: stats.league(session))
        items = [r for r in rows if county is None or r["county"] == county]
        return {"county": county, "items": items, "count": len(items)}

    @router.get("/dumps")
    def dumps(
        status: Status | None = None,
        session: Session = Depends(get_session),  # noqa: B008
    ) -> dict[str, Any]:
        """All dump sites as compact GeoJSON points (id, status, photo flag) for a clustered map."""
        data = cache.get("dumps", lambda: stats.dumps_geojson(session))
        if status is None:
            return data
        return {
            "type": "FeatureCollection",
            "features": [f for f in data["features"] if f["properties"]["status"] == status],
        }

    @router.get("/dumps/{site_id}")
    def dump(site_id: int, session: Session = Depends(get_session)) -> dict[str, Any]:  # noqa: B008
        """One dump site with description, quantities and photos."""
        row = stats.dump_detail(session, site_id)
        if row is None:
            raise HTTPException(404, "Nepoznata lokacija.")
        return row

    @router.get("/nearby")
    def nearby(
        lat: Lat,
        lon: Lon,
        radius_m: Annotated[int, Query(ge=200, le=5000)] = 1500,
        session: Session = Depends(get_session),  # noqa: B008
    ) -> dict[str, Any]:
        """Around an address: dump sites within the radius, nearest facilities, the municipality."""
        if not in_croatia(lon, lat):
            raise HTTPException(422, "Točka nije unutar Hrvatske.")
        body = stats.nearby(session, lat, lon, radius_m)
        body["computed_at"] = datetime.now(UTC).isoformat()
        return body

    @router.get("/facilities")
    def facilities(
        kind: Annotated[str | None, Query(max_length=20)] = None,
        session: Session = Depends(get_session),  # noqa: B008
    ) -> dict[str, Any]:
        """Facilities (recycling yards, landfills, sorting plants, waste centres, composting, cave dumps)."""
        if kind is not None and kind not in FACILITY_LAYERS:
            raise HTTPException(422, "Nepoznata vrsta objekta.")
        data = cache.get("facilities", lambda: stats.facilities_geojson(session))
        if kind is None:
            return data
        return {
            "type": "FeatureCollection",
            "features": [f for f in data["features"] if f["properties"]["kind"] == kind],
        }

    @router.get("/about")
    def about() -> dict[str, Any]:
        """Links and reference values behind the numbers."""
        return {
            "dataset": WASTE_CKAN_URL,
            "eloo": ELOO_PUBLIC_URL,
            "eu_directive": EU_DIRECTIVE_URL,
            "eu_recycling_targets": EU_RECYCLING_TARGETS,
            "facility_labels": FACILITY_LABELS,
            "facility_years": {k: v[1] for k, v in FACILITY_LAYERS.items()},
            "status_labels": STATUS_LABELS,
            "attribution": ATTRIBUTION,
        }

    return router
