"""Unit tests on recorded real data (no network, no database)."""

from __future__ import annotations

import re
from typing import Any

from cistko_api.constants import (
    FACILITY_LAYERS,
    LAYER_COUNTY_RECYCLING_2022,
    LAYER_DUMPS,
    LAYER_SEPARATION_2019,
    LAYER_SEPARATION_2022,
    STATUS_CODES,
    WASTE_CATEGORIES,
)
from cistko_api.ingest.waste import (
    category_of,
    layer_url,
    parse_dump,
    parse_facility,
    parse_quantity,
)
from cistko_api.settings import CistkoSettings
from cistko_api.stats import display_name
from tests.conftest import load


def test_every_layer_used_exists_in_the_wfs(capabilities: str) -> None:
    names = set(re.findall(r"<Name>otpad:([^<]+)</Name>", capabilities))
    used = [LAYER_DUMPS, LAYER_SEPARATION_2022, LAYER_SEPARATION_2019, LAYER_COUNTY_RECYCLING_2022]
    used += [layer for layer, _ in FACILITY_LAYERS.values()]
    assert [x for x in used if x not in names] == []


def test_facility_years_match_the_wfs_titles(capabilities: str) -> None:
    titles = dict(re.findall(r"<Name>otpad:([^<]+)</Name>\s*<Title>([^<]+)</Title>", capabilities))
    for layer, year in FACILITY_LAYERS.values():
        assert titles[layer].startswith(str(year)), (layer, titles[layer])


def test_layer_url_asks_for_geojson_in_wgs84() -> None:
    url = layer_url(CistkoSettings(_env_file=None), "odbaceni_otpad")  # type: ignore[call-arg]
    assert "typeName=otpad%3Aodbaceni_otpad" in url
    assert "srsName=EPSG%3A4326" in url


def test_parse_quantity_reads_the_register_format() -> None:
    assert parse_quantity("2000.00 kg, 20.00 m3") == {"kg": 2000.0, "m3": 20.0}
    assert parse_quantity("80.00 m2") == {"m2": 80.0}
    assert parse_quantity(None) == {}


def test_every_recorded_status_is_known(dumps: list[dict[str, Any]]) -> None:
    statuses = {d["status_lokacije_otpada"] for d in dumps}
    assert statuses <= set(STATUS_CODES)
    assert all(parse_dump(d) is not None for d in dumps)


def test_parse_dump_on_a_recorded_record(dumps: list[dict[str, Any]]) -> None:
    record = next(d for d in dumps if d["odbaceni_otpad_id"] == 3)
    row = parse_dump(record)
    assert row is not None
    assert row["status"] == "on_site"
    assert row["qty_kg"] == 2000.0
    assert row["volume_m3"] == 20.0
    assert row["area_m2"] == 80.0
    assert row["category"] in WASTE_CATEGORIES
    assert len(row["photos"]) == 2
    assert all(p.startswith("https://eloo.haop.hr/") for p in row["photos"])


def test_categories_of_recorded_waste_types(dumps: list[dict[str, Any]]) -> None:
    for d in dumps:
        assert category_of(d.get("vrsta_otpada")) in WASTE_CATEGORIES
    assert category_of("Glomazni otpad") == "glomazni"
    assert category_of("Građevni otpad – ne sadrži opasne tvari, npr. šuta") == "gradevni"
    assert (
        category_of("Građevni otpad – onečišćen opasnim tvarima (npr. koji sadrži azbest)")
        == "opasni"
    )
    assert category_of("Otpadna vozila ili dijelovi vozila (opasni)") == "vozila"
    assert category_of("20 03 01 miješani komunalni otpad") == "mijesani"
    assert category_of(None) == "nepoznato"


def test_parse_facility_on_recorded_samples() -> None:
    for kind, (layer, _year) in FACILITY_LAYERS.items():
        features = load(f"2026-11-07_{layer}_sample.json")["features"]
        assert features, layer
        row = parse_facility(kind, features[0]["properties"])
        assert row["name"], (kind, row)
    yard = parse_facility(
        "recycling_yard",
        load("2026-11-07_rd_stacion_pt_2018_sample.json")["features"][0]["properties"],
    )
    assert yard["name"].startswith("Reciklažno dvorište ")
    assert yard["info"]["oznaka"].startswith("REC-")


def test_separation_2019_matches_its_components() -> None:
    props = load("2026-11-07_jls_stopa_odvajanja_poticajna_2019_sample.json")["features"][0][
        "properties"
    ]
    separated = props["odv_so1"] + props["odv_mrd"] + props["odv_srd"]
    assert round(100 * separated / props["ko_ju"], 2) == round(props["stopa_19"], 2)


def test_display_name() -> None:
    assert display_name("VRSAR - ORSERA") == "Vrsar - Orsera"
    assert display_name("GRAD ZAGREB") == "Grad Zagreb"
    assert display_name("SVETI IVAN ZELINA") == "Sveti Ivan Zelina"
    assert display_name("ANDRIJAŠEVCI") == "Andrijaševci"


def test_photo_urls_map_to_uuids_and_back(dumps: list[dict[str, Any]]) -> None:
    from cistko_api.photos import source_url, uuid_from_url

    urls = [d[k] for d in dumps for k in ("slika_1", "slika_2") if d.get(k)]
    assert urls
    for url in urls:
        uuid = uuid_from_url(url)
        assert uuid is not None, url
        assert source_url(uuid) == url
    assert uuid_from_url("https://example.org/public/api/cms/image/x.jpg") is None
    assert uuid_from_url("https://eloo.haop.hr/public/api/cms/image/../../etc/passwd.jpg") is None


def test_source_url_rejects_non_uuid() -> None:
    import pytest

    from cistko_api.photos import source_url

    with pytest.raises(ValueError, match="photo id"):
        source_url("../secret")
