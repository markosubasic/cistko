# ADR 0010: Čistko data decisions

- Status: accepted
- Date: 2026-11-07

## Context

Čistko combines the layers of the Ministry's waste-management WFS published on the Open Data Portal
(`gospodarenje-otpadom-wfs`, `https://servisi.azo.hr/otpad/wfs`). Evidence is in `apps/cistko/data/evidence/`
(2026-11-07): GetCapabilities, DescribeFeatureType of every used layer, the CKAN record and samples.

## Decisions

1. **Load once into PostGIS.** All layers are small (the largest, `odbaceni_otpad`, is about 10 MB as GeoJSON), so
   `cistko ingest all` downloads them as GeoJSON in EPSG:4326 (WFS 1.1.0 returns lon/lat order on this server,
   checked against known places) and loads them in about a minute. Every load writes an `ingestion_run` row.
2. **Layer choice.** Where the service has several years, the newest layer is used: separation rates 2022 (plus
   2019 for the change), county recycling 2022, landfills, sorting plants and waste centres 2026, composting and cave
   dumps 2025, recycling yards 2018 (no newer layer exists). The year shown in the app is the one in the WFS title.
3. **Municipality of a dump site** is spatial (`ST_Intersects` with the municipality outline); the three points off
   the coast fall back to the municipality named in the register. Spatial and named municipality agree for 14 192 of
   14 195 records.
4. **Waste types** are free text with about 490 spellings; keyword rules group them into 8 categories
   (`category_of`, unit-tested on recorded records).
5. **No ranking by number of dump sites.** 84 % of the register is Grad Zagreb, which records sites
   systematically; the count measures reporting, not waste. The league ranks by the separation rate; dump sites are
   shown as counts and as the share removed.
6. **EU target only next to recycling.** The 55 % target of Directive (EU) 2018/851 concerns recycling; it is shown
   next to the county recycling rate, never next to a municipal separation rate.
7. **Photos are hot-linked** from `eloo.haop.hr` (the register's own server) with `referrerpolicy=no-referrer`;
   production CSP must allow that host for images.
8. **No new dependencies** beyond the shared stack.

## Consequences

- No trend over time for dump sites (records have no date).
- The recycling-yard list is from 2018 and is labelled so.
