"""ASGI entry point: ``uvicorn cistko_api.main:app``."""

from __future__ import annotations

from cistko_api.app import create_cistko_app
from cistko_api.settings import get_settings
from opendata_core.db import make_engine, make_session_dependency

settings = get_settings()
_engine = make_engine(settings)
app = create_cistko_app(settings, make_session_dependency(_engine))
