import { ErrorState, LoadingSkeleton } from '@dt/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DumpCard, StatusChip } from '../components/bits';
import { DumpMap } from '../components/DumpMap';
import { AddressSearch } from '../components/Searches';
import { ApiError, api } from '../lib/api';
import { countyLabel, distance, fullName, int, lokacija, pct } from '../lib/format';
import type { DumpCollection, DumpStatus } from '../lib/types';

const RADII = [500, 1500, 3000];
const ELOO = 'https://eloo.haop.hr/public/';

function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function NearbyPage() {
  const [params] = useSearchParams();
  const lat = num(params.get('lat'));
  const lon = num(params.get('lon'));
  const title = params.get('q');
  const [radius, setRadius] = useState(1500);
  const [show, setShow] = useState(12);
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  const query = useQuery({
    queryKey: ['nearby', lat, lon, radius],
    queryFn: ({ signal }) => api.nearby(lat as number, lon as number, radius, signal),
    enabled: lat != null && lon != null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const empty: DumpCollection = useMemo(() => ({ type: 'FeatureCollection', features: [] }), []);
  const geo = query.data?.points ?? empty;

  if (lat == null || lon == null) {
    return (
      <div className="ck-wrap mt-10 grid max-w-2xl gap-4">
        <h1 className="ck-h2">Oko tvoje adrese</h1>
        <AddressSearch autoFocus />
      </div>
    );
  }
  if (query.isPending) {
    return (
      <div className="ck-wrap mt-10">
        <LoadingSkeleton lines={6} label="Tražim prijave oko adrese…" />
      </div>
    );
  }
  if (query.isError) {
    const outside = query.error instanceof ApiError && query.error.status === 422;
    return (
      <div className="ck-wrap mt-10 grid max-w-2xl gap-4">
        <ErrorState
          message={
            outside
              ? `${query.error.message} Čistko radi za adrese u Hrvatskoj.`
              : query.error.message
          }
          onRetry={outside ? undefined : () => void query.refetch()}
        />
        <AddressSearch />
      </div>
    );
  }

  const d = query.data;
  const m = d.municipality;
  const order: DumpStatus[] = ['on_site', 'reported', 'removed'];
  const listed = onlyPhotos ? d.sites.filter((s) => s.photos.length > 0) : d.sites;

  return (
    <div className="ck-wrap grid gap-10 pt-8">
      <header className="grid gap-4 md:grid-cols-[1fr_minmax(18rem,26rem)] md:items-end">
        <div>
          <p className="ck-muted">Oko tvoje adrese</p>
          <h1 className="mt-3 text-[2rem] sm:text-[2.75rem]">{title ?? 'Odabrana točka'}</h1>
          {m ? (
            <p className="ck-muted mt-2">
              {fullName(m.kind, m.name)}
              {m.county !== m.name ? ` · ${countyLabel(m.county)}` : ''}
            </p>
          ) : null}
        </div>
        <div className="ck-noprint">
          <AddressSearch hideLabel />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg">
              U krugu od <strong>{distance(d.radius_m)}</strong>:{' '}
              <strong className="ck-num">{int(d.counts.total)}</strong> {lokacija(d.counts.total)}{' '}
              odbačenog otpada
            </p>
            <div className="ck-seg" role="group" aria-label="Polumjer pretrage">
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={radius === r}
                  onClick={() => setRadius(r)}
                >
                  {distance(r)}
                </button>
              ))}
            </div>
          </div>
          <DumpMap
            key={`${lat},${lon},${radius}`}
            dumps={geo}
            center={[lon, lat]}
            zoom={radius <= 500 ? 15 : radius <= 1500 ? 13.6 : 12.6}
            home={[lon, lat]}
            radiusM={radius}
            cluster={geo.features.length > 800}
            ariaLabel="Karta odbačenog otpada oko adrese"
            onSelectDump={(id) =>
              document
                .getElementById(`dump-${id}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          />
          <div className="flex flex-wrap gap-2">
            {order.map((s) => (
              <span key={s} className="flex items-center gap-2">
                <StatusChip status={s} />
                <span className="ck-num font-semibold">{d.counts[s]}</span>
              </span>
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-8">
          {m ? (
            <div>
              <h2 className="text-lg font-semibold">{fullName(m.kind, m.name)}</h2>
              <p className="mt-1">
                <span className="ck-num text-[2rem] font-semibold">{pct(m.sep_2022)}</span>
                <span className="ml-2 text-[#5f5f5f]">otpada odvojeno 2022.</span>
              </p>
              <p className="mt-2">
                <Link to={`/opcina/${m.mb}`}>Kartica općine: rang, susjedi, napredak</Link>
              </p>
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold">Najbliža reciklažna dvorišta</h2>
            <table className="ck-table mt-1">
              <tbody>
                {d.recycling_yards.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.name}
                      <span className="block text-sm text-[#5f5f5f]">{f.address}</span>
                    </td>
                    <td className="ck-num text-right">{distance(f.distance_m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-[#5f5f5f]">
              Popis stacionarnih reciklažnih dvorišta iz 2018.
            </p>
          </div>
          <div className="border-t-4 border-[#111] pt-4">
            <h2 className="text-lg font-semibold">Vidiš smeće kojeg nema na karti?</h2>
            <p className="mt-2">
              Prijavi ga u službenu Evidenciju lokacija odbačenog otpada (ELOO). Čistko prikazuje
              objavljenu snimku te evidencije (stanje oko veljače 2024.), pa se nova prijava ovdje
              neće odmah vidjeti.
            </p>
            <a href={ELOO} target="_blank" rel="noreferrer" className="ck-btn mt-4">
              Prijavi odbačeni otpad
            </a>
          </div>
        </aside>
      </section>

      {d.sites.length > 0 ? (
        <section aria-labelledby="list-h">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="list-h" className="ck-h2">
                Prijavljene lokacije
              </h2>
              <p className="ck-muted mt-1 text-sm">
                Prvo najbliže s fotografijom ({int(d.with_photo)} od {int(d.counts.total)} u krugu
                ima fotografiju), zatim ostale po udaljenosti.
              </p>
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={onlyPhotos}
                onChange={(e) => setOnlyPhotos(e.target.checked)}
                className="h-4 w-4 accent-[#111]"
              />
              Samo s fotografijom
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.slice(0, show).map((s) => (
              <div key={s.id} id={`dump-${s.id}`}>
                <DumpCard d={s} compact />
              </div>
            ))}
          </div>
          {listed.length > show ? (
            <button
              type="button"
              className="ck-btn ck-btn--ghost mx-auto mt-6 flex"
              onClick={() => setShow((n) => n + 12)}
            >
              Prikaži još
            </button>
          ) : null}
          {d.counts.total > d.sites.length ? (
            <p className="ck-muted mt-3 text-center text-sm">
              Popis prikazuje {d.sites.length} od {int(d.counts.total)} lokacija; sve su na karti.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="ck-card ck-card-pad text-center">
          U ovom krugu nema prijavljenih lokacija odbačenog otpada. To ne znači nužno da otpada
          nema: većina općina lokacije ne upisuje sustavno.
        </p>
      )}
    </div>
  );
}
