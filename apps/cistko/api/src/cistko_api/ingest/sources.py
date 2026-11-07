"""Registration of Čistko's data sources (``data_source`` rows)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from cistko_api.constants import ELOO_PUBLIC_URL, SRC_WASTE, WASTE_CKAN_URL
from cistko_api.settings import CistkoSettings
from opendata_core.provenance import AccessMethod, Tier, register_source


def register_all(session: Session, settings: CistkoSettings) -> None:
    """Idempotently register every source used by the app."""
    register_source(
        session,
        id=SRC_WASTE,
        title="Gospodarenje otpadom (WFS): odbačeni otpad, stope odvajanja, odlagališta, reciklažna dvorišta",
        publisher="Ministarstvo zaštite okoliša i energetike (Portal otvorenih podataka)",
        url=WASTE_CKAN_URL,
        access_method=AccessMethod.api,
        tier=Tier.official,
        license_name=None,
        notes=(
            f"WFS {settings.waste_wfs_url}. Layers: odbaceni_otpad (register of illegally dumped waste, ELOO "
            f"{ELOO_PUBLIC_URL}, no date per record), jls_stopa_odv_otp_2022, jls_stopa_odvajanja_poticajna_2019, "
            "stopa_rec_zup_2022, rd_stacion_pt_2018, akt_odlag_2026, sortirnice_2026, cgo_2026, kompostane_2025, "
            "depo_speleo_2025. The year of each layer is the one in its WFS title. The CKAN record states no licence."
        ),
    )
    session.commit()
