"""Čistko settings (extends the shared CoreSettings)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field

from opendata_core.config import CoreSettings


class CistkoSettings(CoreSettings):
    """Environment: DATABASE_URL, CONTACT_EMAIL, NOMINATIM_URL, CORS_ORIGINS, WASTE_WFS_URL, DATA_DIR."""

    app_name: str = "cistko"
    data_dir: Path = Path("apps/cistko/data")
    waste_wfs_url: str = "https://servisi.azo.hr/otpad/wfs"
    download_timeout_s: float = 300.0
    cors_origins: str = Field(
        default="http://localhost:5177,http://127.0.0.1:5177",
        description="Comma-separated list of allowed browser origins.",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins as a list (explicit origins only)."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def raw_dir(self) -> Path:
        """Downloaded source files (not committed)."""
        return self.data_dir / "raw"


@lru_cache
def get_settings() -> CistkoSettings:
    """Process-wide settings."""
    return CistkoSettings()
