"""Queries behind the API: national overview, municipality card, league, maps, nearby."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from cistko_api.constants import (
    EU_RECYCLING_TARGETS,
    FACILITY_LABELS,
    FACILITY_LAYERS,
    STATUS_LABELS,
    WASTE_CATEGORIES,
)

KIND_LABEL = {"GR": "Grad", "OP": "Općina"}


def display_name(name: str | None) -> str:
    """``"VRSAR - ORSERA"`` -> ``"Vrsar - Orsera"`` (the source writes names in upper case)."""
    if not name:
        return ""
    small = {"NA", "I", "U", "PRI", "OD", "KOD", "PO"}
    words = name.split(" ")
    out = []
    for i, w in enumerate(words):
        out.append(
            w.lower() if i > 0 and w in small else "-".join(p.capitalize() for p in w.split("-"))
        )
    return " ".join(out)


def _r(x: Any, nd: int = 1) -> float | None:
    return None if x is None else round(float(x), nd)


def _status_counts(
    session: Session, where: str = "", params: dict[str, Any] | None = None
) -> dict[str, int]:
    rows = session.execute(
        text(f"select status, count(*) from dump_site {where} group by status"),  # noqa: S608
        params or {},
    ).all()
    counts = dict.fromkeys(STATUS_LABELS, 0)
    counts.update({r[0]: int(r[1]) for r in rows})
    counts["total"] = sum(counts[k] for k in STATUS_LABELS)
    return counts


def _category_counts(
    session: Session, where: str = "", params: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    # ``where`` is one of two fixed strings in this module; values always go through bind params
    sql = f"select category, count(*) n from dump_site {where} group by category order by n desc"  # noqa: S608
    rows = session.execute(text(sql), params or {}).all()
    return [{"category": r[0], "label": WASTE_CATEGORIES[r[0]], "count": int(r[1])} for r in rows]


def _removed_share(counts: dict[str, int]) -> float | None:
    return None if counts["total"] == 0 else round(100 * counts["removed"] / counts["total"], 1)


def overview(session: Session) -> dict[str, Any]:
    """National numbers for the home page."""
    dumps = _status_counts(session)
    with_photo = session.execute(
        text("select count(*) from dump_site where jsonb_array_length(photos) > 0")
    ).scalar_one()
    top_mun = session.execute(
        text(
            "select m.name, count(*) n, m.mb from dump_site d join municipality m using (mb) "
            "group by m.name, m.mb order by n desc limit 1"
        )
    ).one()
    sep = session.execute(
        text(
            "select percentile_cont(0.5) within group (order by sep_2022), "
            "percentile_cont(0.5) within group (order by sep_2019), max(sep_2022), "
            "sum(case when sep_2022 >= 50 then 1 else 0 end), sum(case when sep_2022 < 10 then 1 else 0 end), "
            "sum(case when sep_2022 > sep_2019 then 1 else 0 end), count(*) from municipality"
        )
    ).one()
    best = session.execute(
        text(
            "select mb, name, county, sep_2022 from municipality order by sep_2022 desc nulls last limit 1"
        )
    ).one()
    counties = session.execute(
        text(
            "select c.rb, c.name, c.recycling_2022, "
            "percentile_cont(0.5) within group (order by m.sep_2022) med, count(m.mb) n "
            "from county c left join municipality m on m.county_rb = c.rb "
            "group by c.rb, c.name, c.recycling_2022 order by c.recycling_2022 desc nulls last"
        )
    ).mappings()
    facilities = dict(
        session.execute(text("select kind, count(*) from facility group by kind")).all()
    )  # type: ignore[arg-type]
    # The register is dominated by one city: split the counts so the home page can tell that story.
    top_counts = _status_counts(session, "where mb = :mb", {"mb": top_mun[2]})
    rest_counts = _status_counts(session, "where mb is distinct from :mb", {"mb": top_mun[2]})
    without = session.execute(
        text(
            "select count(*) from municipality m "
            "where not exists (select 1 from dump_site d where d.mb = m.mb)"
        )
    ).scalar_one()
    return {
        "story": {
            "top": {"mb": top_mun[2], "name": display_name(top_mun[0])}
            | top_counts
            | {"removed_share": _removed_share(top_counts)},
            "rest": rest_counts | {"removed_share": _removed_share(rest_counts)},
            "municipalities_without_dumps": int(without),
        },
        "dumps": dumps
        | {
            "with_photo": int(with_photo),
            "categories": _category_counts(session),
            "removed_share": _removed_share(dumps),
            "top_municipality": {"name": display_name(top_mun[0]), "count": int(top_mun[1])},
        },
        "separation": {
            "median_2022": _r(sep[0]),
            "median_2019": _r(sep[1]),
            "max_2022": _r(sep[2]),
            "at_least_50": int(sep[3]),
            "under_10": int(sep[4]),
            "improved": int(sep[5]),
            "municipalities": int(sep[6]),
            "best": {
                "mb": best.mb,
                "name": display_name(best.name),
                "county": best.county,
                "sep_2022": _r(best.sep_2022),
            },
        },
        "counties": [
            {
                "rb": c["rb"],
                "name": c["name"],
                "recycling_2022": _r(c["recycling_2022"]),
                "median_separation_2022": _r(c["med"]),
                "municipalities": int(c["n"]),
            }
            for c in counties
        ],
        "facilities": {
            k: {
                "count": int(facilities.get(k, 0)),
                "label": FACILITY_LABELS[k],
                "year": FACILITY_LAYERS[k][1],
            }
            for k in FACILITY_LAYERS
        },
        "eu_recycling_targets": EU_RECYCLING_TARGETS,
    }


def search(session: Session, q: str) -> list[dict[str, Any]]:
    """Municipalities whose name contains ``q`` (case-insensitive), best matches first."""
    rows = session.execute(
        text(
            "select mb, name, kind, county, sep_2022 from municipality where name ilike :like "
            "order by (name ilike :prefix) desc, length(name), name limit 12"
        ),
        {"like": f"%{q.strip()}%", "prefix": f"{q.strip()}%"},
    ).mappings()
    return [
        {
            "mb": r["mb"],
            "name": display_name(r["name"]),
            "kind": KIND_LABEL.get(r["kind"], r["kind"]),
            "county": r["county"],
            "sep_2022": _r(r["sep_2022"]),
        }
        for r in rows
    ]


def league(session: Session) -> list[dict[str, Any]]:
    """Every municipality ranked by the 2022 separation rate (ties share the rank)."""
    rows = session.execute(
        text(
            """
            with d as (
              select mb, count(*) total, sum(case when status = 'removed' then 1 else 0 end) removed
              from dump_site group by mb
            )
            select m.mb, m.name, m.kind, m.county, m.sep_2022, m.sep_2019,
                   rank() over (order by m.sep_2022 desc nulls last) rank_hr,
                   rank() over (partition by m.county order by m.sep_2022 desc nulls last) rank_county,
                   coalesce(d.total, 0) dumps, coalesce(d.removed, 0) removed
            from municipality m left join d using (mb)
            order by m.sep_2022 desc nulls last, m.name
            """
        )
    ).mappings()
    return [
        {
            "mb": r["mb"],
            "name": display_name(r["name"]),
            "kind": KIND_LABEL.get(r["kind"], r["kind"]),
            "county": r["county"],
            "sep_2022": _r(r["sep_2022"]),
            "sep_2019": _r(r["sep_2019"]),
            "change_pp": None
            if r["sep_2022"] is None or r["sep_2019"] is None
            else _r(r["sep_2022"] - r["sep_2019"]),
            "rank_hr": int(r["rank_hr"]),
            "rank_county": int(r["rank_county"]),
            "dumps": int(r["dumps"]),
            "removed": int(r["removed"]),
        }
        for r in rows
    ]


def municipalities_geojson(session: Session) -> dict[str, Any]:
    """Simplified outlines with the numbers the choropleth and the tooltips need."""
    rows = session.execute(
        text(
            """
            with d as (
              select mb, count(*) total, sum(case when status = 'removed' then 1 else 0 end) removed
              from dump_site group by mb
            )
            select m.mb, m.name, m.kind, m.county, m.sep_2022, m.sep_2019,
                   coalesce(d.total, 0) dumps, coalesce(d.removed, 0) removed,
                   ST_AsGeoJSON(m.geom_simple, 5) g
            from municipality m left join d using (mb)
            """
        )
    ).mappings()
    features = [
        {
            "type": "Feature",
            "id": int(r["mb"]),
            "geometry": json.loads(r["g"]),
            "properties": {
                "mb": r["mb"],
                "name": display_name(r["name"]),
                "kind": KIND_LABEL.get(r["kind"], r["kind"]),
                "county": r["county"],
                "sep_2022": _r(r["sep_2022"]),
                "sep_2019": _r(r["sep_2019"]),
                "dumps": int(r["dumps"]),
                "removed": int(r["removed"]),
            },
        }
        for r in rows
        if r["g"]
    ]
    return {"type": "FeatureCollection", "features": features}


def dumps_geojson(session: Session) -> dict[str, Any]:
    """Every dump site as a compact point (id, status, photo flag)."""
    rows = session.execute(
        text(
            "select id, status, jsonb_array_length(photos) > 0 p, ST_X(geom) x, ST_Y(geom) y, mb "
            "from dump_site"
        )
    ).all()
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": r[0],
                "geometry": {"type": "Point", "coordinates": [round(r[3], 5), round(r[4], 5)]},
                "properties": {"id": r[0], "status": r[1], "photo": bool(r[2]), "mb": r[5]},
            }
            for r in rows
        ],
    }


def _dump_row(r: Any) -> dict[str, Any]:
    return {
        "id": r["id"],
        "name": r["name"],
        "description": r["description"],
        "settlement": r["settlement"],
        "municipality": display_name(r["mname"])
        if r.get("mname")
        else display_name(r["municipality_label"]),
        "mb": r["mb"],
        "waste_type": r["waste_type"],
        "category": r["category"],
        "category_label": WASTE_CATEGORIES[r["category"]],
        "qty_kg": r["qty_kg"],
        "volume_m3": r["volume_m3"],
        "area_m2": r["area_m2"],
        "status": r["status"],
        "status_label": STATUS_LABELS[r["status"]],
        "photos": r["photos"] or [],
        "lon": round(float(r["x"]), 6),
        "lat": round(float(r["y"]), 6),
    }


_DUMP_SELECT = (
    "select d.id, d.name, d.description, d.settlement, d.municipality_label, d.mb, d.waste_type, d.category, d.qty_kg, "
    "d.volume_m3, d.area_m2, d.status, d.photos, ST_X(d.geom) x, ST_Y(d.geom) y, m.name mname "
    "from dump_site d left join municipality m using (mb) "
)


def photo_sample(session: Session, limit: int) -> list[dict[str, Any]]:
    """Photographed sites from as many different municipalities as possible, in a stable order
    (one site per municipality, picked by a hash of its id, so the selection does not change between
    requests but is spread over the country)."""
    sql = _DUMP_SELECT + "where jsonb_array_length(d.photos) > 0 and d.mb is not null"
    rows = session.execute(text(sql)).mappings().all()
    seen: set[str] = set()
    picked: list[dict[str, Any]] = []
    for r in sorted(rows, key=lambda r: hashlib.md5(str(r["id"]).encode()).hexdigest()):  # noqa: S324
        if r["mb"] in seen:
            continue
        seen.add(r["mb"])
        picked.append(_dump_row(r))
        if len(picked) >= limit:
            break
    return picked


def dump_detail(session: Session, site_id: int) -> dict[str, Any] | None:
    """One dump site."""
    r = session.execute(text(_DUMP_SELECT + "where d.id = :id"), {"id": site_id}).mappings().first()
    return None if r is None else _dump_row(r)


def _facilities_near(
    session: Session, lat: float, lon: float, kind: str, limit: int
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            "select id, kind, year, name, operator, address, status, url, info, ST_X(geom) x, ST_Y(geom) y, "
            "ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) dist "
            "from facility where kind = :k order by geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) limit :n"
        ),
        {"lat": lat, "lon": lon, "k": kind, "n": limit},
    ).mappings()
    return [_facility_row(r) | {"distance_m": round(float(r["dist"]))} for r in rows]


def _facility_row(r: Any) -> dict[str, Any]:
    return {
        "id": r["id"],
        "kind": r["kind"],
        "kind_label": FACILITY_LABELS[r["kind"]],
        "year": r["year"],
        "name": r["name"],
        "operator": r["operator"],
        "address": r["address"],
        "status": r["status"],
        "url": r["url"],
        "info": {k: v for k, v in (r["info"] or {}).items() if v is not None},
        "lon": round(float(r["x"]), 6),
        "lat": round(float(r["y"]), 6),
    }


def _photos_first(sites: list[dict[str, Any]], photos: int, total: int) -> list[dict[str, Any]]:
    """Up to ``photos`` sites with a photo (nearest first), then the nearest remaining ones."""
    with_photo = [s for s in sites if s["photos"]][:photos]
    chosen = {s["id"] for s in with_photo}
    rest = [s for s in sites if s["id"] not in chosen][: max(0, total - len(with_photo))]
    return with_photo + rest


def nearby(session: Session, lat: float, lon: float, radius_m: int) -> dict[str, Any]:
    """Dump sites within ``radius_m`` of the point, nearest facilities and the municipality."""
    point = "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)"
    params = {"lat": lat, "lon": lon, "r": radius_m}
    # ``point`` is a fixed SQL fragment; coordinates always go through bind params
    sql_mun = f"select mb, name, kind, county, sep_2022 from municipality where ST_Intersects(geom, {point})"  # noqa: S608
    mun = session.execute(text(sql_mun), params).mappings().first()
    within = _DUMP_SELECT.replace("from dump_site d", ", d.geom g from dump_site d")
    rows = session.execute(
        text(
            f"select q.*, ST_Distance(q.g::geography, {point}::geography) dist from ("  # noqa: S608
            f"{within} where ST_DWithin(d.geom::geography, {point}::geography, :r)) q order by dist"
        ),
        params,
    ).mappings()
    sites = [_dump_row(r) | {"distance_m": round(float(r["dist"]))} for r in rows]
    counts = {k: sum(1 for s in sites if s["status"] == k) for k in STATUS_LABELS}
    counts["total"] = len(sites)
    return {
        "location": {"lat": round(lat, 6), "lon": round(lon, 6)},
        "radius_m": radius_m,
        "municipality": None
        if mun is None
        else {
            "mb": mun["mb"],
            "name": display_name(mun["name"]),
            "kind": KIND_LABEL.get(mun["kind"], mun["kind"]),
            "county": mun["county"],
            "sep_2022": _r(mun["sep_2022"]),
        },
        "counts": counts,
        # the 30 nearest sites that have a photo, then the nearest others (60 sites at most)
        "sites": _photos_first(sites, 30, 60),
        "with_photo": sum(1 for s in sites if s["photos"]),
        "points": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
                    "properties": {
                        "id": s["id"],
                        "status": s["status"],
                        "photo": bool(s["photos"]),
                        "mb": s["mb"],
                    },
                }
                for s in sites
            ],
        },
        "recycling_yards": _facilities_near(session, lat, lon, "recycling_yard", 3),
        "nearest": {
            kind: (_facilities_near(session, lat, lon, kind, 1) or [None])[0]
            for kind in ("landfill", "sorting", "cgo", "compost", "cave_dump")
        },
    }


def municipality_card(session: Session, mb: str) -> dict[str, Any] | None:
    """Everything the municipality page shows."""
    m = (
        session.execute(
            text(
                "select mb, name, kind, county, county_rb, sep_2022, sep_2019, waste_2019_t, mixed_2019_t, "
                "separated_2019_t, ST_X(ST_PointOnSurface(geom)) x, ST_Y(ST_PointOnSurface(geom)) y, "
                "ST_XMin(geom) x0, ST_YMin(geom) y0, ST_XMax(geom) x1, ST_YMax(geom) y1, "
                "ST_Area(geom::geography) / 1e6 km2 from municipality where mb = :mb"
            ),
            {"mb": mb},
        )
        .mappings()
        .first()
    )
    if m is None:
        return None
    ranks = (
        session.execute(
            text(
                "select r.rank_hr, r.rank_county, r.n_hr, r.n_county from ("
                " select mb, rank() over (order by sep_2022 desc nulls last) rank_hr,"
                " rank() over (partition by county order by sep_2022 desc nulls last) rank_county,"
                " count(*) over () n_hr, count(*) over (partition by county) n_county from municipality"
                ") r where r.mb = :mb"
            ),
            {"mb": mb},
        )
        .mappings()
        .one()
    )
    county = (
        session.execute(
            text(
                "select c.name, c.recycling_2022, (select percentile_cont(0.5) within group (order by sep_2022) "
                "from municipality where county_rb = :rb) med from county c where c.rb = :rb"
            ),
            {"rb": m["county_rb"]},
        )
        .mappings()
        .first()
    )
    national_median = session.execute(
        text("select percentile_cont(0.5) within group (order by sep_2022) from municipality")
    ).scalar_one()
    counts = _status_counts(session, "where mb = :mb", {"mb": mb})
    totals = session.execute(
        text("select sum(qty_kg), sum(volume_m3), sum(area_m2) from dump_site where mb = :mb"),
        {"mb": mb},
    ).one()
    categories = _category_counts(session, "where mb = :mb", {"mb": mb})
    photos = (
        session.execute(
            text(
                _DUMP_SELECT
                + "where d.mb = :mb and jsonb_array_length(d.photos) > 0 order by d.id desc limit 9"
            ),
            {"mb": mb},
        )
        .mappings()
        .all()
    )
    facilities = session.execute(
        text(
            "select id, kind, year, name, operator, address, status, url, info, ST_X(geom) x, ST_Y(geom) y "
            "from facility where mb = :mb order by kind, name"
        ),
        {"mb": mb},
    ).mappings()
    neighbours = session.execute(
        text(
            "select n.mb, n.name, n.sep_2022 from municipality m join municipality n "
            "on n.mb <> m.mb and ST_Touches(m.geom, n.geom) where m.mb = :mb order by n.sep_2022 desc nulls last"
        ),
        {"mb": mb},
    ).mappings()
    yards = _facilities_near(session, float(m["y"]), float(m["x"]), "recycling_yard", 3)
    return {
        "mb": m["mb"],
        "name": display_name(m["name"]),
        "kind": KIND_LABEL.get(m["kind"], m["kind"]),
        "county": m["county"],
        "area_km2": _r(m["km2"]),
        "center": [round(float(m["x"]), 5), round(float(m["y"]), 5)],
        "bbox": [round(float(m[k]), 5) for k in ("x0", "y0", "x1", "y1")],
        "separation": {
            "rate_2022": _r(m["sep_2022"]),
            "rate_2019": _r(m["sep_2019"]),
            "change_pp": None
            if m["sep_2022"] is None or m["sep_2019"] is None
            else _r(m["sep_2022"] - m["sep_2019"]),
            "rank_hr": int(ranks["rank_hr"]),
            "of_hr": int(ranks["n_hr"]),
            "rank_county": int(ranks["rank_county"]),
            "of_county": int(ranks["n_county"]),
            "national_median_2022": _r(national_median),
            "county_median_2022": _r(county["med"]) if county else None,
            "waste_2019_t": _r(m["waste_2019_t"]),
            "mixed_2019_t": _r(m["mixed_2019_t"]),
            "separated_2019_t": _r(m["separated_2019_t"]),
        },
        "county_recycling_2022": _r(county["recycling_2022"]) if county else None,
        "eu_recycling_targets": EU_RECYCLING_TARGETS,
        "dumps": counts
        | {
            "removed_share": _removed_share(counts),
            "qty_kg": _r(totals[0], 0),
            "volume_m3": _r(totals[1], 0),
            "area_m2": _r(totals[2], 0),
            "categories": categories,
            "with_photos": [_dump_row(r) for r in photos],
        },
        "facilities": [_facility_row(r) for r in facilities],
        "recycling_yards_nearest": yards,
        "neighbours": [
            {"mb": n["mb"], "name": display_name(n["name"]), "sep_2022": _r(n["sep_2022"])}
            for n in neighbours
        ],
    }


def facilities_geojson(session: Session) -> dict[str, Any]:
    """All facilities as GeoJSON points."""
    rows = session.execute(
        text(
            "select id, kind, year, name, operator, address, status, url, info, ST_X(geom) x, ST_Y(geom) y from facility"
        )
    ).mappings()
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": r["id"],
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(r["x"]), 6), round(float(r["y"]), 6)],
                },
                "properties": {
                    k: v for k, v in _facility_row(r).items() if k not in ("lon", "lat")
                },
            }
            for r in rows
        ],
    }
