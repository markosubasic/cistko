"""``cistko`` command line: ingestion."""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from typing import Any

import structlog
import typer
from sqlalchemy.orm import Session

from cistko_api.db import make_session_factory
from cistko_api.settings import CistkoSettings, get_settings
from opendata_core.logging import configure_logging

app = typer.Typer(help="Čistko: ingestion", no_args_is_help=True)
ingest_app = typer.Typer(help="Load data sources", no_args_is_help=True)
app.add_typer(ingest_app, name="ingest")

log = structlog.get_logger("cistko.cli")

Step = Callable[[Session, CistkoSettings], Any]


def _run(name: str, step: Step) -> Any:
    settings = get_settings()
    configure_logging(settings)
    if not settings.database_url:
        raise typer.BadParameter("DATABASE_URL is not set (see apps/cistko/.env.example)")
    if not settings.contact_email:
        raise typer.BadParameter(
            "CONTACT_EMAIL is not set: external sources need an identifying User-Agent"
        )
    t0 = time.time()
    with make_session_factory(settings)() as session:
        result = step(session, settings)
    log.info("step_done", step=name, seconds=round(time.time() - t0, 1))
    return result


@ingest_app.command("sources")
def sources() -> None:
    """Register all data sources."""
    from cistko_api.ingest.sources import register_all

    _run("sources", register_all)


@ingest_app.command("all")
def all_steps(
    refresh: bool = typer.Option(False, help="Download again even if the raw files exist"),
) -> None:
    """Sources, municipalities with rates, counties, dump sites and facilities."""
    from cistko_api.ingest.sources import register_all
    from cistko_api.ingest.waste import ingest_waste

    def step(session: Session, settings: CistkoSettings) -> Any:
        register_all(session, settings)
        return ingest_waste(session, settings, refresh)

    typer.echo(json.dumps(_run("all", step), indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":  # pragma: no cover
    app()
