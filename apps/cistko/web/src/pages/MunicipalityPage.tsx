import { ErrorState, LoadingSkeleton } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompareBars, Photo, StatusChip } from '../components/bits';
import { DumpMap } from '../components/DumpMap';
import { MunicipalitySearch } from '../components/Searches';
import { api } from '../lib/api';
import { countyLabel, distance, fullName, int, mass, pct, signedPp } from '../lib/format';
import type { DumpStatus } from '../lib/types';

export function MunicipalityPage() {
  const { mb = '' } = useParams();
  const card = useQuery({
    queryKey: ['municipality', mb],
    queryFn: ({ signal }) => api.municipality(mb, signal),
    retry: false,
  });
  const dumps = useQuery({
    queryKey: ['dumps', mb],
    queryFn: ({ signal }) => api.dumps(mb, signal),
  });
  const outlines = useQuery({
    queryKey: ['outlines'],
    queryFn: ({ signal }) => api.outlines(signal),
  });
  const facilities = useQuery({
    queryKey: ['facilities'],
    queryFn: ({ signal }) => api.facilities(signal),
  });
  const outline = useMemo(
    () => outlines.data?.features.find((f) => f.properties.mb === mb)?.geometry,
    [outlines.data, mb],
  );

  if (card.isPending) {
    return (
      <div className="ck-wrap mt-10">
        <LoadingSkeleton lines={8} label="Učitavam karticu općine…" />
      </div>
    );
  }
  if (card.isError) {
    return (
      <div className="ck-wrap mt-10 grid max-w-xl gap-4">
        <ErrorState message={card.error.message} />
        <MunicipalitySearch />
      </div>
    );
  }
  const c = card.data;
  const s = c.separation;
  const total = c.dumps.total;
  const order: DumpStatus[] = ['on_site', 'reported', 'removed'];
  // The register often attaches the same picture to several sites: show each picture once.
  const gallery = c.dumps.with_photos.filter(
    (d, i, all) => all.findIndex((x) => x.photos[0] === d.photos[0]) === i,
  );
  const neighbours = [...c.neighbours, { mb: c.mb, name: c.name, sep_2022: s.rate_2022 }].sort(
    (a, b) => (b.sep_2022 ?? -1) - (a.sep_2022 ?? -1),
  );

  return (
    <div className="ck-wrap grid gap-10 pt-8">
      <header className="grid gap-4 md:grid-cols-[1fr_minmax(16rem,22rem)] md:items-end">
        <div>
          <p className="ck-muted">{countyLabel(c.county)}</p>
          <h1 className="mt-3 text-[2rem] sm:text-[2.75rem]">{fullName(c.kind, c.name)}</h1>
          <p className="mt-2 text-lg">
            {s.rank_hr}. od {s.of_hr} u Hrvatskoj · {s.rank_county}. od {s.of_county} u županiji
          </p>
        </div>
        <div className="ck-noprint">
          <MunicipalitySearch hideLabel />
        </div>
      </header>

      <dl className="ck-stats">
        <div>
          <dd className="ck-stat-value ck-num">{pct(s.rate_2022)}</dd>
          <dt className="ck-stat-label">otpada odvojeno 2022.</dt>
        </div>
        <div>
          <dd className="ck-stat-value ck-num">{signedPp(s.change_pp)}</dd>
          <dt className="ck-stat-label">promjena od 2019. ({pct(s.rate_2019)})</dt>
        </div>
        <div>
          <dd className="ck-stat-value ck-num">{int(total)}</dd>
          <dt className="ck-stat-label">upisanih lokacija</dt>
        </div>
        <div>
          <dd className="ck-stat-value ck-num">{total > 0 ? pct(c.dumps.removed_share) : '–'}</dd>
          <dt className="ck-stat-label">upisanih lokacija uklonjeno</dt>
        </div>
      </dl>

      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="ck-h2">Odvajanje u usporedbi</h2>
          <div className="mt-4">
            <CompareBars
              rows={[
                { label: fullName(c.kind, c.name), value: s.rate_2022, strong: true },
                { label: 'Medijan županije', value: s.county_median_2022 },
                { label: 'Medijan Hrvatske', value: s.national_median_2022 },
              ]}
            />
          </div>
          {s.waste_2019_t ? (
            <p className="ck-inset mt-6">
              U 2019. jedinica je u javnoj usluzi prikupila {int(s.waste_2019_t)} t komunalnog
              otpada, od toga {int(s.mixed_2019_t ?? 0)} t miješanog i{' '}
              {int(s.separated_2019_t ?? 0)} t odvojenog.
            </p>
          ) : null}
          <h3 className="mt-8 text-lg font-semibold">Županija i cilj EU</h3>
          <div className="mt-3">
            <CompareBars
              rows={[
                { label: countyLabel(c.county), value: c.county_recycling_2022, strong: true },
              ]}
              target={{
                value: 55,
                label: 'Cilj EU za 2025.: 55 % recikliranja (Direktiva 2018/851)',
              }}
            />
          </div>
        </div>
        <div>
          <h2 className="ck-h2">Susjedne jedinice</h2>
          <table className="ck-table mt-3">
            <tbody>
              {neighbours.map((n) => (
                <tr key={n.mb}>
                  <td>
                    {n.mb === c.mb ? (
                      <strong>{n.name}</strong>
                    ) : (
                      <Link to={`/opcina/${n.mb}`}>{n.name}</Link>
                    )}
                  </td>
                  <td className={`ck-num text-right ${n.mb === c.mb ? 'font-semibold' : ''}`}>
                    {pct(n.sep_2022)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-3">
          <h2 className="ck-h2">Odbačeni otpad u evidenciji</h2>
          {total > 0 ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {order.map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <StatusChip status={k} />
                  <span className="ck-num font-semibold">{int(c.dumps[k])}</span>
                </span>
              ))}
              {c.dumps.qty_kg ? (
                <span className="text-[#5f5f5f]">Procijenjena masa: {mass(c.dumps.qty_kg)}</span>
              ) : null}
            </div>
          ) : (
            <p className="ck-muted">
              Za ovu jedinicu nema upisanih lokacija. To može značiti da ih nema ili da ih nitko ne
              upisuje.
            </p>
          )}
          {dumps.data && outlines.data && facilities.data ? (
            <DumpMap
              dumps={dumps.data}
              facilities={facilities.data}
              facilityKinds={['recycling_yard']}
              outline={outline}
              center={c.center}
              zoom={10}
              fitBbox={c.bbox}
              cluster={dumps.data.features.length > 300}
              ariaLabel={`Karta odbačenog otpada i objekata za ${c.name}`}
            />
          ) : (
            <div className="ck-map h-[460px]" />
          )}
          <p className="ck-muted text-sm">
            Crveno: otpad je na lokaciji. Žuto: prijavili građani. Zeleno: uklonjeno. Plavo:
            reciklažno dvorište.
          </p>
        </div>
        <aside className="grid content-start gap-8">
          {c.dumps.categories.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold">Što se odbacuje</h3>
              <table className="ck-table mt-1">
                <tbody>
                  {c.dumps.categories.slice(0, 6).map((k) => (
                    <tr key={k.category}>
                      <td>{k.label}</td>
                      <td className="ck-num text-right font-semibold">{int(k.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div>
            <h3 className="text-lg font-semibold">Najbliža reciklažna dvorišta</h3>
            <table className="ck-table mt-1">
              <tbody>
                {c.recycling_yards_nearest.map((f) => (
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
            <p className="mt-2 text-sm text-[#5f5f5f]">Od središta jedinice; popis iz 2018.</p>
          </div>
        </aside>
      </section>

      {gallery.length > 0 ? (
        <section aria-labelledby="ph-h">
          <h2 id="ph-h" className="ck-h2">
            Fotografije iz evidencije
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {gallery.map((d) => (
              <figure key={d.id} className="m-0 grid gap-1.5">
                <Photo src={d.photos[0]!} alt={d.description ?? d.category_label} />
                <figcaption className="grid gap-0.5 text-sm">
                  <span className="truncate">{d.settlement ?? d.category_label}</span>
                  <StatusChip status={d.status} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <p className="ck-muted text-sm">
        Izvor: Ministarstvo zaštite okoliša i energetike, slojevi „JLS, stopa odvajanja komunalnog
        otpada u okviru javne usluge” (2022.), „JLS, stopa odvajanja poticajna” (2019.) i „Županije,
        stopa recikliranja komunalnog otpada” (2022.). <Link to="/o-podacima">Kako računamo</Link>
      </p>
    </div>
  );
}
