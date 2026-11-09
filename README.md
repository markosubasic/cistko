# Čistko

**Gdje je smeće i tko ga čisti?** Karta 14 195 prijavljenih lokacija odbačenog otpada u Hrvatskoj s fotografijama i
statusom (na lokaciji, prijavili građani, uklonjeno), stope odvajanja otpada za svih 556 općina i gradova (2022. i
2019.), županijske stope recikliranja uz cilj EU od 55 %, reciklažna dvorišta, odlagališta, sortirnice, centri za
gospodarenje otpadom, kompostane i otpad u špiljama. Sve iz službenih podataka Ministarstva na Portalu otvorenih
podataka.

Rješenje za **Datathon Portala otvorenih podataka 2026.**, izazov B „Okoliš i održivi prostor”.
Izvorni kôd je pod licencom [EUPL-1.2](LICENSE).

|                                    |                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Video prezentacija                 | _poveznica se dodaje prije predaje_                                              |
| Radni prototip                     | https://cistko.64-226-85-138.sslip.io                                            |
| Tehnička i projektna dokumentacija | [apps/cistko/docs/README.md](apps/cistko/docs/README.md)                         |
| Odluke o podacima                  | [docs/adr/0010-cistko-data-decisions.md](docs/adr/0010-cistko-data-decisions.md) |
| Izvori podataka s dokazima         | [apps/cistko/data/evidence/](apps/cistko/data/evidence/)                         |

## Što radi

- **Oko tvoje adrese**: sve prijavljene lokacije u krugu 0,5 / 1,5 / 3 km s fotografijom i statusom, najbliža
  reciklažna dvorišta, stopa odvajanja tvoje općine i poveznica na službenu prijavu (ELOO).
- **Kartica općine**: stopa odvajanja 2022. i 2019., rang u Hrvatskoj i županiji, usporedba s medijanom i susjedima,
  upisane lokacije po statusu i vrsti, udio uklonjenog, fotografije, objekti na području.
- **Liga općina**: svih 556 jedinica s filtrom po županiji i sortiranjem po odvajanju, napretku, broju lokacija i
  udjelu uklonjenog, uz kartu Hrvatske.
- **Karta otpada**: 14 195 lokacija (grupirane), uz slojeve objekata za gospodarenje otpadom.

## Podaci

Svi podaci dolaze iz skupa [Gospodarenje otpadom - WFS](https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs)
Ministarstva zaštite okoliša i energetike (Portal otvorenih podataka), servis `https://servisi.azo.hr/otpad/wfs`:
`odbaceni_otpad`, `jls_stopa_odv_otp_2022`, `jls_stopa_odvajanja_poticajna_2019`, `stopa_rec_zup_2022`,
`rd_stacion_pt_2018`, `akt_odlag_2026`, `sortirnice_2026`, `cgo_2026`, `kompostane_2025`, `depo_speleo_2025`.
Adrese: [OpenStreetMap Nominatim](https://nominatim.org/). Karta: © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors (ODbL), [OpenFreeMap](https://openfreemap.org/). Detalji, izračuni i ograničenja:
[dokumentacija](apps/cistko/docs/README.md).

**Ažurnost.** Sloj `odbaceni_otpad` je snimka Evidencije lokacija odbačenog otpada (ELOO) iz približno veljače 2024.
(procjena prema datumima u opisima i datumima snimanja fotografija; sami zapisi nemaju datum). Čistko ga je preuzeo 7. 11. 2026. i 9. 11. 2026. provjerio da je u servisu nepromijenjen. Živa evidencija na eloo.haop.hr danas ima oko
20 300 javnih lokacija; vidi [dokaze](apps/cistko/data/evidence/2026-11-09_freshness_findings.txt).

## Struktura repozitorija

```
apps/cistko/api    FastAPI + Typer CLI (cistko_api), Alembic migracije, testovi sa stvarnim snimljenim odgovorima
apps/cistko/web    React 18 + Vite + TypeScript + Tailwind + MapLibre (SPA)
apps/cistko/data   evidence/ (sirovi odgovori izvora s datumom)
apps/cistko/docs   dokumentacija aplikacije
packages/core      opendata_core: konfiguracija, HTTP s cacheom, provenijencija izvora, geokodiranje, tvornica API-ja
packages/ui        @dt/ui: tokeni, Tailwind preset, pristupačne React komponente, MapView
infra/             slika baze (PostGIS), Dockerfile za API i SPA
docs/              FOUNDATION.md (konvencije), adr/ (odluke)
```

## Brzo pokretanje

Potrebno: Docker, [uv](https://docs.astral.sh/uv/) (Python 3.12), Node 20+ i pnpm 9, make (na Windowsu Git Bash).

```bash
cp .env.example .env              # postavite POSTGRES_PASSWORD; DATABASE_URL neka završava s /cistko
make dev                          # PostgreSQL 16 + PostGIS (Docker projekt datathon-2026)
uv sync && pnpm install
make migrate APP=cistko
make ingest APP=cistko STEP=all   # oko 1 minute
uv run --package cistko-api uvicorn cistko_api.main:app --port 8050
CISTKO_API_URL=http://127.0.0.1:8050 pnpm --filter cistko-web dev   # http://127.0.0.1:5177
```

Ako je baza već podignuta iz drugog repozitorija tima (isti Docker projekt `datathon-2026`), a baza `cistko` još ne
postoji: `docker compose exec db psql -U postgres -c "CREATE DATABASE cistko"` i
`docker compose exec db psql -U postgres -d cistko -c "CREATE EXTENSION postgis"`.

Testovi: `uv run pytest apps/cistko/api` i `pnpm --filter cistko-web test`.

## Korišteni alati

Rješenje koristi isključivo softver otvorenog koda (Python, FastAPI, SQLAlchemy, PostgreSQL/PostGIS, React, Vite,
MapLibre GL i ostalo navedeno u `pyproject.toml` i `package.json`). Za razvoj je korišten alat temeljen na umjetnoj
inteligenciji **Claude Code** (Anthropic); radna pravila za taj alat su u [CLAUDE.md](CLAUDE.md).

## Tim

Tim **Polaris**, Fakultet elektrotehnike i računarstva, Sveučilište u Zagrebu:

- Marko Subašić
- Ivan Stipić
- Mentor: prof. dr. sc. Zvonko Kostanjčar

Zajednička osnova (`packages/core`, `packages/ui`, `infra/`) izdvojena je iz repozitorija
[istipic/datathon-2026](https://github.com/istipic/datathon-2026) s očuvanom poviješću commitova.
