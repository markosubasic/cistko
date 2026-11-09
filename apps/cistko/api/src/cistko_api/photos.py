"""Photos of the ELOO register served from Čistko's own origin.

The register's images live on ``eloo.haop.hr``. Some browsers and networks block or slow down those
third-party images, so the API fetches each image once, keeps it on disk and serves it from
``/api/v1/photo/<uuid>.jpg``. Only UUID file names under the register's image path are accepted.
"""

from __future__ import annotations

import re
import threading
from pathlib import Path

import httpx

from cistko_api.settings import CistkoSettings
from opendata_core import http as http_mod

ELOO_IMAGE_BASE = "https://eloo.haop.hr/public/api/cms/image/"
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
UUID_RE = re.compile(rf"^{_UUID}$")
ELOO_URL_RE = re.compile(rf"^https://eloo\.haop\.hr/public/api/cms/image/({_UUID})\.jpg$")
MAX_BYTES = 10 * 1024 * 1024

_lock = threading.Lock()


class PhotoError(Exception):
    """The photo could not be fetched from the register."""


def uuid_from_url(url: str) -> str | None:
    """UUID of a register image URL, or None for any other URL."""
    m = ELOO_URL_RE.match(url.strip())
    return m.group(1) if m else None


def source_url(uuid: str) -> str:
    """Register URL of a photo UUID (raises ValueError for anything that is not a UUID)."""
    if not UUID_RE.match(uuid):
        raise ValueError("not a photo id")
    return f"{ELOO_IMAGE_BASE}{uuid}.jpg"


def cache_path(settings: CistkoSettings, uuid: str) -> Path:
    """Where the photo is kept on disk."""
    return settings.data_dir / "photos" / f"{uuid}.jpg"


def get_photo(settings: CistkoSettings, uuid: str) -> bytes:
    """Photo bytes from the disk cache, fetching them from the register the first time."""
    url = source_url(uuid)
    path = cache_path(settings, uuid)
    if path.exists():
        return path.read_bytes()
    timeout = httpx.Timeout(30.0, connect=10.0)
    try:
        with httpx.Client(
            timeout=timeout,
            headers={"User-Agent": http_mod.user_agent(settings)},
            follow_redirects=False,
        ) as client:
            response = client.get(url)
    except httpx.HTTPError as exc:
        raise PhotoError(type(exc).__name__) from exc
    ctype = response.headers.get("content-type", "")
    if response.status_code != 200 or not ctype.startswith("image/"):
        raise PhotoError(f"status {response.status_code}, {ctype}")
    if len(response.content) > MAX_BYTES:
        raise PhotoError("too large")
    with _lock:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".part")
        tmp.write_bytes(response.content)
        tmp.replace(path)
    return response.content
