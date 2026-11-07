"""Load the waste-management WFS layers into PostGIS.

Every layer is requested once as GeoJSON in EPSG:4326 (WFS 1.1.0 on this server returns lon/lat order
for ``srsName=EPSG:4326``, checked against known places on 2026-11-07), kept in ``data/raw/waste/``
and loaded. Dump sites and facilities get the municipality (``mb``) whose boundary contains them.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import httpx
import structlog
from sqlalchemy import text
from sqlalchemy.orm import Session

from cistko_api.constants import (
    FACILITY_LAYERS,
    LAYER_COUNTY_RECYCLING_2022,
    LAYER_DUMPS,
    LAYER_SEPARATION_2019,
    LAYER_SEPARATION_2022,
    SRC_WASTE,
    STATUS_CODES,
)
from cistko_api.settings import CistkoSettings
from opendata_core import http as http_mod
from opendata_core.provenance import record_ingestion

log = structlog.get_logger(__name__)

SIMPLIFY_DEG = 0.002  # about 150-200 m: municipality outlines for the browser


def layer_url(settings: CistkoSettings, layer: str) -> str:
    """GetFeature URL of one layer (all features, GeoJSON, WGS84)."""
    params = httpx.QueryParams(
        {
            "service": "WFS",
            "version": "1.1.0",
            "request": "GetFeature",
            "typeName": f"otpad:{layer}",
            "outputFormat": "application/json",
            "srsName": "EPSG:4326",
        }
    )
    return f"{settings.waste_wfs_url}?{params}"


def download(settings: CistkoSettings, layer: str, refresh: bool = False) -> tuple[Path, str]:
    """Download one layer to ``raw/waste/<layer>.geojson`` (kept unless ``refresh``)."""
    dest = settings.raw_dir / "waste" / f"{layer}.geojson"
    if dest.exists() and not refresh:
        return dest, ""
    timeout = httpx.Timeout(settings.download_timeout_s, connect=30.0)
    with httpx.Client(
        timeout=timeout,
        headers={"User-Agent": http_mod.user_agent(settings)},
        follow_redirects=True,
    ) as client:
        return http_mod.download_file(client, layer_url(settings, layer), dest)


def _features(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return list(data.get("features", []))


# ---------------------------------------------------------------- parsing (pure) -----------------

_QTY = re.compile(r"([\d.]+)\s*(kg|m3|m2)")


def parse_quantity(value: str | None) -> dict[str, float]:
    """``"2000.00 kg, 20.00 m3"`` -> ``{"kg": 2000.0, "m3": 20.0}`` (units as written in the register)."""
    out: dict[str, float] = {}
    for number, unit in _QTY.findall(value or ""):
        try:
            out[unit] = float(number)
        except ValueError:
            continue
    return out


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def category_of(waste_type: str | None) -> str:
    """One of :data:`WASTE_CATEGORIES` from the free-text waste type of the register (keyword rules)."""
    if not waste_type:
        return "nepoznato"
    t = waste_type.lower()
    if "ne sadrži opasne" in t:
        return "gradevni"
    if any(
        k in t for k in ("azbest", "onečišćen opasn", "opasni otpad", "kemikal", "ulja", "(opasni)")
    ):
        return "opasni" if "vozil" not in t else "vozila"
    if any(k in t for k in ("vozil", "gume", "guma")):
        return "vozila"
    if "elektr" in t:
        return "elektronicki"
    if any(k in t for k in ("glomazn", "krupni")):
        return "glomazni"
    if any(k in t for k in ("građev", "gradev", "šuta", "zemlja", "kamen")):
        return "gradevni"
    if any(k in t for k in ("miješan", "mješan", "mješov", "komunaln")):
        return "mijesani"
    return "ostalo"


def parse_dump(props: dict[str, Any]) -> dict[str, Any] | None:
    """A dump-site row from the ELOO attributes, or None when the status is unknown."""
    status = STATUS_CODES.get(str(props.get("status_lokacije_otpada") or "").strip())
    if status is None:
        return None
    qty = parse_quantity(props.get("ukupna_kolicina_otpada"))
    area = parse_quantity(props.get("procijenjena_povrsina_otpada"))
    photos = [
        props[k] for k in ("slika_1", "slika_2", "slika_3", "slika_4") if _clean(props.get(k))
    ]
    return {
        "id": int(props["odbaceni_otpad_id"]),
        "name": _clean(props.get("nazivi_lokacije")),
        "description": _clean(props.get("opis_lokacije")),
        "settlement": _clean(props.get("naselje")),
        "municipality_label": _clean(props.get("grad_opcina")),
        "waste_type": _clean(props.get("vrsta_otpada")),
        "category": category_of(_clean(props.get("vrsta_otpada"))),
        "qty_kg": qty.get("kg"),
        "volume_m3": qty.get("m3"),
        "area_m2": area.get("m2"),
        "status": status,
        "photos": photos,
    }


def parse_facility(kind: str, props: dict[str, Any]) -> dict[str, Any]:
    """Name, operator, address, status, url and the remaining attributes of a facility."""
    p = {k: v for k, v in props.items() if v not in (None, "")}
    if kind == "recycling_yard":
        place = str(p.get("mjesto_obj") or "").strip()
        return {
            "name": f"Reciklažno dvorište {place.title()}".strip(),
            "operator": p.get("naziv_subj"),
            "address": ", ".join(str(x) for x in (p.get("adresa_obj"), p.get("mjesto_obj")) if x),
            "status": None,
            "url": None,
            "info": {
                "oznaka": p.get("ozn_rec_dv"),
                "obuhvacena": p.get("obuhvacena"),
                "zupanija": p.get("zupanija"),
            },
        }
    if kind == "landfill":
        return {
            "name": p.get("naziv_odla"),
            "operator": p.get("upravlja"),
            "address": ", ".join(str(x) for x in (p.get("naselje"), p.get("g_o")) if x),
            "status": p.get("status_ope"),
            "url": None,
            "info": {k: p.get(k) for k in ("vrsta", "kategorija", "sanacija", "zupanija")},
        }
    if kind == "sorting":
        return {
            "name": p.get("naziv_subj"),
            "operator": p.get("naziv_subj"),
            "address": ", ".join(str(x) for x in (p.get("adr_obj"), p.get("jls")) if x),
            "status": None,
            "url": None,
            "info": {"zupanija": p.get("zupanija")},
        }
    if kind == "cgo":
        return {
            "name": p.get("naziv"),
            "operator": None,
            "address": None,
            "status": p.get("status"),
            "url": None,
            "info": {"pripad_jls": p.get("pripad_jls"), "zupanija": p.get("zu_ime")},
        }
    if kind == "compost":
        return {
            "name": p.get("pravna_oso"),
            "operator": p.get("pravna_oso"),
            "address": p.get("kat_opcina"),
            "status": p.get("status"),
            "url": None,
            "info": {"kapacitet_t_god": p.get("kapa_t_god"), "zupanija": p.get("zupanija")},
        }
    if kind == "cave_dump":
        return {
            "name": p.get("ime_obj"),
            "operator": p.get("izvor"),
            "address": None,
            "status": None,
            "url": p.get("link"),
            "info": {
                "kat_br": p.get("kat_br"),
                "duljina": p.get("duljina"),
                "dubina": p.get("dubina"),
            },
        }
    raise ValueError(f"unknown facility kind {kind}")


def _num(value: Any) -> float | None:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- loading ------------------------


def load_municipalities(
    session: Session, f2022: list[dict[str, Any]], f2019: list[dict[str, Any]]
) -> int:
    """Municipalities with 2022 and 2019 rates (2019 joined by ``jls_mb``)."""
    by_mb_2019 = {str(f["properties"]["jls_mb"]): f["properties"] for f in f2019}
    session.execute(text("delete from municipality"))
    n = 0
    for f in f2022:
        p = f["properties"]
        old = by_mb_2019.get(str(p["jls_mb"]), {})
        separated = (
            sum(_num(old.get(k)) or 0.0 for k in ("odv_so1", "odv_mrd", "odv_srd")) if old else None
        )
        session.execute(
            text(
                "insert into municipality (mb, name, kind, county, county_rb, sep_2022, sep_2019, waste_2019_t, "
                "mixed_2019_t, separated_2019_t, geom, geom_simple) select :mb, :name, :kind, :county, :rb, "
                ":s22, :s19, :w, :m, :s, g.geom, ST_Multi(ST_SimplifyPreserveTopology(g.geom, :tol)) "
                "from (select ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:g), 4326)), 3)) geom) g"
            ),
            {
                "mb": str(p["jls_mb"]),
                "name": p.get("jls_ime"),
                "kind": p.get("jls_st"),
                "county": p.get("zu_ime"),
                "rb": str(p.get("zu_rb")),
                "s22": _num(p.get("st_ju2")),
                "s19": _num(old.get("stopa_19")) if old else None,
                "w": _num(old.get("ko_ju")) if old else None,
                "m": _num(old.get("mko_so1")) if old else None,
                "s": separated,
                "g": json.dumps(f["geometry"]),
                "tol": SIMPLIFY_DEG,
            },
        )
        n += 1
    return n


def load_counties(session: Session, features: list[dict[str, Any]]) -> int:
    """Counties with the 2022 recycling rate."""
    session.execute(text("delete from county"))
    for f in features:
        p = f["properties"]
        session.execute(
            text(
                "insert into county (rb, name, recycling_2022, geom_simple) select :rb, :name, :rate, "
                "ST_Multi(ST_SimplifyPreserveTopology(ST_CollectionExtract(ST_MakeValid("
                "ST_SetSRID(ST_GeomFromGeoJSON(:g), 4326)), 3), :tol))"
            ),
            {
                "rb": str(p["zu_rb"]),
                "name": p.get("zu_ime"),
                "rate": _num(p.get("stopa2")),
                "g": json.dumps(f["geometry"]),
                "tol": SIMPLIFY_DEG * 2,
            },
        )
    return len(features)


def load_dumps(session: Session, features: list[dict[str, Any]]) -> dict[str, int]:
    """Dump sites; returns counts of loaded and skipped records."""
    session.execute(text("delete from dump_site"))
    loaded = skipped = 0
    for f in features:
        row = parse_dump(f.get("properties") or {})
        geom = f.get("geometry")
        if row is None or not geom:
            skipped += 1
            continue
        session.execute(
            text(
                "insert into dump_site (id, name, description, settlement, municipality_label, waste_type, category, qty_kg, "
                "volume_m3, area_m2, status, photos, geom) values (:id, :name, :description, :settlement, "
                ":municipality_label, :waste_type, :category, :qty_kg, :volume_m3, :area_m2, :status, cast(:photos as jsonb), "
                "ST_SetSRID(ST_GeomFromGeoJSON(:g), 4326)) on conflict (id) do nothing"
            ),
            {**row, "photos": json.dumps(row["photos"]), "g": json.dumps(geom)},
        )
        loaded += 1
    session.execute(
        text(
            "update dump_site d set mb = m.mb from municipality m where ST_Intersects(m.geom, d.geom)"
        )
    )
    # points just off the coast (outside every boundary): use the municipality named in the register
    session.execute(
        text(
            "update dump_site d set mb = m.mb from municipality m "
            "where d.mb is null and upper(m.name) = upper(d.municipality_label)"
        )
    )
    return {"loaded": loaded, "skipped": skipped}


def load_facilities(session: Session, kind: str, year: int, features: list[dict[str, Any]]) -> int:
    """Facilities of one kind (MultiPoint geometries are reduced to their centroid)."""
    session.execute(text("delete from facility where kind = :k"), {"k": kind})
    n = 0
    for f in features:
        geom = f.get("geometry")
        if not geom:
            continue
        row = parse_facility(kind, f.get("properties") or {})
        session.execute(
            text(
                "insert into facility (kind, year, name, operator, address, status, url, info, geom) values "
                "(:kind, :year, :name, :operator, :address, :status, :url, cast(:info as jsonb), "
                "ST_PointOnSurface(ST_SetSRID(ST_GeomFromGeoJSON(:g), 4326)))"
            ),
            {
                **row,
                "kind": kind,
                "year": year,
                "info": json.dumps(row["info"]),
                "g": json.dumps(geom),
            },
        )
        n += 1
    session.execute(
        text(
            "update facility f set mb = m.mb from municipality m where f.kind = :k and ST_Intersects(m.geom, f.geom)"
        ),
        {"k": kind},
    )
    return n


def ingest_waste(
    session: Session, settings: CistkoSettings, refresh: bool = False
) -> dict[str, Any]:
    """Download and load every layer used by the app."""
    result: dict[str, Any] = {}

    def fetch(layer: str) -> tuple[list[dict[str, Any]], str]:
        path, sha = download(settings, layer, refresh)
        return _features(path), sha

    with record_ingestion(session, SRC_WASTE, layer_url(settings, LAYER_SEPARATION_2022)) as run:
        f22, sha = fetch(LAYER_SEPARATION_2022)
        f19, _ = fetch(LAYER_SEPARATION_2019)
        run.rows = load_municipalities(session, f22, f19)
        run.sha256 = sha or None
    result["municipalities"] = run.rows
    with record_ingestion(
        session, SRC_WASTE, layer_url(settings, LAYER_COUNTY_RECYCLING_2022)
    ) as run:
        fz, sha = fetch(LAYER_COUNTY_RECYCLING_2022)
        run.rows = load_counties(session, fz)
        run.sha256 = sha or None
    result["counties"] = run.rows
    with record_ingestion(session, SRC_WASTE, layer_url(settings, LAYER_DUMPS)) as run:
        fd, sha = fetch(LAYER_DUMPS)
        counts = load_dumps(session, fd)
        run.rows = counts["loaded"]
        run.sha256 = sha or None
    result["dump_sites"] = counts
    for kind, (layer, year) in FACILITY_LAYERS.items():
        with record_ingestion(session, SRC_WASTE, layer_url(settings, layer)) as run:
            ff, sha = fetch(layer)
            run.rows = load_facilities(session, kind, year, ff)
            run.sha256 = sha or None
        result[kind] = run.rows
        log.info("facilities_loaded", kind=kind, rows=run.rows)
    session.execute(text("analyze"))
    session.commit()
    return result
