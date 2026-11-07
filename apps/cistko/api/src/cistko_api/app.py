"""Application factory for the Čistko API."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import FastAPI

from cistko_api.api import make_router
from cistko_api.settings import CistkoSettings
from opendata_core.app_factory import create_app


def create_cistko_app(settings: CistkoSettings, get_session: Callable[..., Any]) -> FastAPI:
    """Build the app (settings and session dependency)."""
    return create_app(
        settings,
        [make_router(get_session, settings)],
        settings.cors_origin_list,
        get_session=get_session,
        title="Čistko API",
    )
