# Čistko

**Gdje je smeće i tko ga čisti?** Čistko na jednom mjestu pokazuje prijavljeni odbačeni otpad u Hrvatskoj s
fotografijama i statusom (otpad na lokaciji, prijavili građani, uklonjeno), koliko otpada odvaja svaka od 556
općina i gradova (2022. i 2019.), županijske stope recikliranja u odnosu na cilj EU te reciklažna dvorišta,
odlagališta, sortirnice, centre za gospodarenje otpadom, kompostane i otpad u špiljama.

Datathon Portala otvorenih podataka 2026., izazov B „Okoliš i održivi prostor” (gospodarenje otpadom).
Kôd: EUPL-1.2.

## Problem i korisnici

Podaci o otpadu postoje, ali su razbacani po GIS slojevima koje građanin ne zna čitati: evidencija odbačenog otpada
s fotografijama, stope odvajanja po općinama, popisi objekata. Nitko ih ne spaja u odgovor na jednostavna pitanja.

- **Građanin**: što je odbačeno oko moje adrese, je li uklonjeno, gdje je najbliže reciklažno dvorište i kako stoji
  moja općina? Ako vidi novo smeće, Čistko ga vodi na službeni obrazac za prijavu (ELOO).
- **Općina i grad**: kartica s rangom u Hrvatskoj i županiji, napretkom od 2019., usporedbom sa susjedima i stanjem
  upisanih lokacija; pogodna za izvješće vijeću ili plan gospodarenja otpadom.
- **Novinari, udruge, ministarstvo**: liga svih 556 jedinica i karta cijele Hrvatske.

## Arhitektura

```
 Ministarstvo zaštite okoliša i energetike: „Gospodarenje otpadom” (WFS, data.gov.hr)      Nominatim (OSM)
   odbaceni_otpad · jls_stopa_odv_otp_2022 · jls_stopa_odvajanja_poticajna_2019 ·               │ adrese
   stopa_rec_zup_2022 · rd_stacion_pt_2018 · akt_odlag_2026 · sortirnice_2026 · cgo_2026 ·      │
   kompostane_2025 · depo_speleo_2025                                                           │
        │                                                                                       │
        └── cistko ingest all (Typer CLI): GeoJSON EPSG:4326 → PostgreSQL + PostGIS ───────────┤
              municipality, county, dump_site, facility, data_source, ingestion_run            │
                                     │                                                          │
                     FastAPI /api/v1 (overview, municipalities, league, dumps, nearby, facilities, geocode)
                                     │
                     React SPA (Vite, TypeScript, Tailwind, @dt/ui, MapLibre GL)  ◄── Caddy
```

- `api/`: paket `cistko_api` (uv workspace član `cistko-api`), ASGI `cistko_api.main:app`, CLI `cistko`.
- `web/`: paket `cistko-web` (React 18, Vite, TypeScript strict, Tailwind 3, `@dt/ui`, MapLibre).
- Učitavanje svih slojeva traje oko jedne minute; odgovori API-ja su ispod 0,2 s (sporiji pregledi se pamte u
  memoriji procesa dok se podaci ponovno ne učitaju).

## Izvori podataka

| Sloj (WFS `otpad:`)                  | Sadržaj                                                                                                                                            | Godina u nazivu sloja |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `odbaceni_otpad`                     | Lokacije odbačenog otpada (Evidencija lokacija odbačenog otpada, ELOO): opis, naselje, vrsta i količina otpada, površina, status, do 4 fotografije | bez datuma po zapisu  |
| `jls_stopa_odv_otp_2022`             | JLS, stopa odvajanja komunalnog otpada u okviru javne usluge (%), s granicama 556 jedinica                                                         | 2022.                 |
| `jls_stopa_odvajanja_poticajna_2019` | JLS, stopa odvajanja poticajna, s količinama ukupnog, miješanog i odvojenog otpada                                                                 | 2019.                 |
| `stopa_rec_zup_2022`                 | Županije, stopa recikliranja komunalnog otpada (%)                                                                                                 | 2022.                 |
| `rd_stacion_pt_2018`                 | Reciklažna dvorišta, stacionarna                                                                                                                   | 2018.                 |
| `akt_odlag_2026`                     | Odlagališta s aktivnom dozvolom gospodarenja otpadom                                                                                               | 2026.                 |
| `sortirnice_2026`                    | Sortirnice                                                                                                                                         | 2026.                 |
| `cgo_2026`                           | Centri za gospodarenje otpadom                                                                                                                     | 2026.                 |
| `kompostane_2025`                    | Kompostane                                                                                                                                         | 2025.                 |
| `depo_speleo_2025`                   | Divlji deponiji otpada u speleološkim objektima                                                                                                    | 2025.                 |

- Skup na portalu: [Gospodarenje otpadom - WFS](https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs),
  izdavač Ministarstvo zaštite okoliša i energetike; servis `https://servisi.azo.hr/otpad/wfs`. CKAN zapis ne navodi
  licenciju.
- Fotografije se učitavaju izravno s poslužitelja evidencije (`eloo.haop.hr`).
- Geokodiranje adresa: OpenStreetMap Nominatim (cache 30 dana). Karta: © OpenStreetMap contributors, OpenFreeMap.
- Cilj EU: [Direktiva (EU) 2018/851](https://eur-lex.europa.eu/legal-content/HR/TXT/?uri=CELEX:32018L0851), čl. 11.:
  barem 55 % pripreme za ponovnu uporabu i recikliranja komunalnog otpada do 2025.

Dokazi sondiranja (GetCapabilities, DescribeFeatureType svih korištenih slojeva, CKAN zapis, uzorci) su u
[`../data/evidence/`](../data/evidence/). Odluke: [ADR 0010](../../../docs/adr/0010-cistko-data-decisions.md).

## Kako Čistko računa

- **Stopa odvajanja** je vrijednost iz sloja (2022.: `st_ju2`; 2019.: `stopa_19`). Za 2019. test provjerava da je
  jednaka zbroju odvojeno prikupljenog otpada (`odv_so1 + odv_mrd + odv_srd`) podijeljenom s ukupnim (`ko_ju`).
- **Rang** u Hrvatskoj i županiji po stopi 2022. (jednake stope dijele mjesto), **medijan** Hrvatske i županije,
  **promjena** 2019. → 2022. u postotnim bodovima.
- **Cilj EU od 55 %** prikazuje se samo uz županijsku stopu recikliranja, nikad uz stopu odvajanja općine (to nisu
  iste mjere).
- **Lokacija → općina**: točka u granicama jedinice (PostGIS `ST_Intersects`); tri točke tik uz obalu dobivaju
  jedinicu po nazivu iz evidencije. Provjera: prostorno pridruživanje i naziv iz evidencije slažu se za 14 192 od
  14 195 lokacija.
- **Vrsta otpada** (slobodan tekst u evidenciji) svrstava se ključnim riječima u 8 skupina.
- **Oko adrese**: sve lokacije u krugu 0,5 / 1,5 / 3 km (geografska udaljenost), najbliža reciklažna dvorišta i
  objekti.

## API (`/api/v1`)

| Ruta                              | Opis                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /overview`                   | nacionalni brojevi: lokacije po statusu i vrsti, medijani odvajanja, županije, broj objekata |
| `GET /municipalities?q=`          | pretraga jedinica po nazivu                                                                  |
| `GET /municipalities.geojson`     | pojednostavljene granice 556 jedinica sa stopama i brojem lokacija                           |
| `GET /municipalities/{mb}`        | kartica: stope, rang, medijani, lokacije, vrste, fotografije, objekti, susjedi               |
| `GET /league?county=`             | liga po stopi odvajanja 2022.                                                                |
| `GET /dumps?status=&mb=`          | lokacije kao kompaktan GeoJSON                                                               |
| `GET /dumps/{id}`                 | jedna lokacija s opisom, količinom i fotografijama                                           |
| `GET /nearby?lat=&lon=&radius_m=` | oko adrese: lokacije, brojevi po statusu, najbliža dvorišta i objekti, jedinica              |
| `GET /facilities?kind=`           | objekti (reciklažna dvorišta, odlagališta, sortirnice, CGO, kompostane, špilje)              |
| `GET /geocode?q=`                 | adresa u Hrvatskoj (Nominatim)                                                               |
| `GET /sources`, `GET /health`     | izvori s vremenom dohvaćanja, zdravlje (zajednička jezgra)                                   |

## Pokretanje

```bash
make dev                                         # PostgreSQL + PostGIS, Mailpit
make migrate APP=cistko
make ingest APP=cistko STEP=all                  # oko 1 minute
uv run --package cistko-api uvicorn cistko_api.main:app --port 8050
CISTKO_API_URL=http://127.0.0.1:8050 pnpm --filter cistko-web dev    # http://127.0.0.1:5177
```

## Testovi

```bash
uv run pytest apps/cistko/api       # parsiranje i provjere na snimljenim stvarnim odgovorima WFS-a
pnpm --filter cistko-web test       # stranice na snimljenim odgovorima API-ja
```

## Poznata ograničenja

- Evidencija pokazuje koliko se prijavljuje, a ne koliko je otpada: 11 856 od 14 195 lokacija je u Gradu Zagrebu, a
  mnoge jedinice nemaju nijednu. Zato Čistko ne rangira po broju lokacija.
- Zapisi evidencije nemaju datum, pa se ne može prikazati kretanje kroz vrijeme.
- Količine i površine su procjene osobe koja je lokaciju upisala.
- Popis reciklažnih dvorišta u servisu je iz 2018.
- Stopa 0 % znači da u javnoj usluzi nije prijavljen odvojeno prikupljen otpad (31 jedinica u 2022.).
