"""Source ids, WFS layer names and reference values.

All layers come from the WFS of the Ministry's waste-management database on the Open Data Portal
("Gospodarenje otpadom - WFS", https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs,
service https://servisi.azo.hr/otpad/wfs). Layer names and attributes were probed on 2026-11-07;
evidence is in apps/cistko/data/evidence/.
"""

from __future__ import annotations

SRC_WASTE = "mzoe-gospodarenje-otpadom"
WASTE_CKAN_URL = "https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs"
ELOO_PUBLIC_URL = "https://eloo.haop.hr/public/"

# WFS feature types (without the "otpad:" prefix) and the year in their WFS title
LAYER_DUMPS = "odbaceni_otpad"  # "Lokacije odbačenog otpada" (ELOO), no year in the title
LAYER_SEPARATION_2022 = (
    "jls_stopa_odv_otp_2022"  # JLS, stopa odvajanja komunalnog otpada u okviru javne usluge (%)
)
LAYER_SEPARATION_2019 = "jls_stopa_odvajanja_poticajna_2019"  # JLS, stopa odvajanja poticajna
LAYER_COUNTY_RECYCLING_2022 = (
    "stopa_rec_zup_2022"  # Županije, stopa recikliranja komunalnog otpada (%)
)

FACILITY_LAYERS: dict[str, tuple[str, int]] = {
    # kind: (layer, year in the WFS title)
    "recycling_yard": ("rd_stacion_pt_2018", 2018),
    "landfill": ("akt_odlag_2026", 2026),
    "sorting": ("sortirnice_2026", 2026),
    "cgo": ("cgo_2026", 2026),
    "compost": ("kompostane_2025", 2025),
    "cave_dump": ("depo_speleo_2025", 2025),
}

FACILITY_LABELS: dict[str, str] = {
    "recycling_yard": "Reciklažno dvorište",
    "landfill": "Odlagalište",
    "sorting": "Sortirnica",
    "cgo": "Centar za gospodarenje otpadom",
    "compost": "Kompostana",
    "cave_dump": "Otpad u špilji ili jami",
}

STATUS_CODES: dict[str, str] = {
    "Otpad na lokaciji": "on_site",
    "Prijavljen otpad na lokaciji od strane javnosti": "reported",
    "Uklonjen otpad": "removed",
}
WASTE_CATEGORIES: dict[str, str] = {
    "glomazni": "Glomazni otpad",
    "mijesani": "Miješani komunalni otpad",
    "gradevni": "Građevni otpad",
    "opasni": "Opasni otpad (azbest, kemikalije, ulja)",
    "vozila": "Vozila, dijelovi i gume",
    "elektronicki": "Električni i elektronički otpad",
    "ostalo": "Ostalo",
    "nepoznato": "Vrsta nije navedena",
}

STATUS_LABELS: dict[str, str] = {
    "on_site": "Otpad na lokaciji",
    "reported": "Prijavili građani",
    "removed": "Uklonjeno",
}

# Directive (EU) 2018/851 amending Directive 2008/98/EC, Article 11(2)(c)-(e): preparing for re-use and
# recycling of municipal waste at least 55 % by 2025, 60 % by 2030, 65 % by 2035 (by weight).
# This target is about recycling, not separate collection; the app shows it next to the county
# recycling rate and never next to a municipal separation rate as if they were the same measure.
EU_RECYCLING_TARGETS = {2025: 55, 2030: 60, 2035: 65}
EU_DIRECTIVE_URL = "https://eur-lex.europa.eu/legal-content/HR/TXT/?uri=CELEX:32018L0851"
