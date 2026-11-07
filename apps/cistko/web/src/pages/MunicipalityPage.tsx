import { ErrorState, LoadingSkeleton } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompareBars, Photo, RateGauge, StatusChip } from '../components/bits';
import { DumpMap } from '../components/DumpMap';
import { ArrowIcon, RecycleIcon, TrophyIcon } from '../components/icons';
import { MunicipalitySearch } from '../components/Searches';
import { api } from '../lib/api';
import {
  countyLabel,
  distance,
  fullName,
  int,
  mass,
  pct,
  rateColor,
  signedPp,
  STATUS_COLOR,
} from '../lib/format';
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
  const better = c.neighbours.filter((n) => (n.sep_2022 ?? 0) > (s.rate_2022 ?? 0)).length;

  return (
    <div className="ck-wrap mt-8 grid gap-8">
      <header className="grid gap-4 md:grid-cols-[1fr_minmax(18rem,24rem)] md:items-end">
        <div>
          <p className="ck-eyebrow">{countyLabel(c.county)}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-5xl">
            {fullName(c.kind, c.name)}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="ck-chip bg-[#d1fae5] text-[#065f46]">
              <TrophyIcon width={16} height={16} /> {s.rank_hr}. od {s.of_hr} u Hrvatskoj
            </span>
            <span className="ck-chip bg-[#efede6]">
              {s.rank_county}. od {s.of_county} u županiji
            </span>
          </div>
        </div>
        <div className="ck-noprint">
          <MunicipalitySearch hideLabel />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="ck-card ck-card-pad grid content-start gap-4">
          <h2 className="font-semibold">Koliko otpada odvaja</h2>
          <RateGauge
            value={s.rate_2022}
            label="odvojeno prikupljeno, 2022."
            ticks={
              s.national_median_2022 != null
                ? [{ value: s.national_median_2022, label: 'Hrvatska' }]
                : []
            }
          />
          <p className="text-center">
            U 2019. bilo je <strong className="ck-num">{pct(s.rate_2019)}</strong>, promjena{' '}
            <strong
              className="ck-num"
              style={{ color: (s.change_pp ?? 0) >= 0 ? '#13804A' : '#B42318' }}
            >
              {signedPp(s.change_pp)}
            </strong>
          </p>
          <p className="-mt-2 text-center text-xs text-[#5b6662]">
            Crtica na luku: medijan Hrvatske
          </p>
          <CompareBars
            rows={[
              { label: fullName(c.kind, c.name), value: s.rate_2022, strong: true },
              { label: 'Medijan županije', value: s.county_median_2022 },
              { label: 'Medijan Hrvatske', value: s.national_median_2022 },
            ]}
          />
        </div>

        <div className="ck-card ck-card-pad grid content-start gap-4">
          <h2 className="font-semibold">Odbačeni otpad u evidenciji</h2>
          <p>
            <span className="ck-num text-5xl font-semibold">{int(total)}</span>{' '}
            <span className="ck-muted">upisanih lokacija</span>
          </p>
          {total > 0 ? (
            <>
              <div className="flex h-4 overflow-hidden rounded-full" aria-hidden="true">
                {order.map((k) => (
                  <span
                    key={k}
                    style={{ width: `${(100 * c.dumps[k]) / total}%`, background: STATUS_COLOR[k] }}
                  />
                ))}
              </div>
              <ul className="grid gap-2">
                {order.map((k) => (
                  <li key={k} className="flex items-center justify-between">
                    <StatusChip status={k} />
                    <span className="ck-num font-semibold">{int(c.dumps[k])}</span>
                  </li>
                ))}
              </ul>
              <p className="rounded-xl bg-[#ecfdf5] p-3 text-sm">
                Uklonjeno je <strong>{pct(c.dumps.removed_share)}</strong> upisanih lokacija.
                {c.dumps.qty_kg ? (
                  <>
                    {' '}
                    Procijenjena masa svih upisanih lokacija:{' '}
                    <strong>{mass(c.dumps.qty_kg)}</strong>.
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <p className="ck-muted text-sm">
              Za ovu jedinicu nema upisanih lokacija. To može značiti da ih nema ili da ih nitko ne
              upisuje.
            </p>
          )}
        </div>

        <div className="ck-card ck-card-pad grid content-start gap-4">
          <h2 className="font-semibold">Županija i EU</h2>
          <p className="text-sm text-[#5b6662]">
            Stopa recikliranja komunalnog otpada u županiji 2022. i cilj EU od 55 % do 2025.
          </p>
          <CompareBars
            rows={[{ label: countyLabel(c.county), value: c.county_recycling_2022, strong: true }]}
            target={{ value: 55, label: 'Cilj EU za 2025.: 55 % (Direktiva 2018/851)' }}
          />
          {s.waste_2019_t ? (
            <div className="rounded-xl bg-[#f6f5f1] p-3 text-sm">
              <p className="font-semibold">Komunalni otpad u javnoj usluzi, 2019.</p>
              <p className="mt-1">
                Ukupno {int(s.waste_2019_t)} t, od toga miješanog {int(s.mixed_2019_t ?? 0)} t i
                odvojeno {int(s.separated_2019_t ?? 0)} t.
              </p>
            </div>
          ) : null}
          {c.dumps.categories.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Što se odbacuje</p>
              <ul className="grid gap-1 text-sm">
                {c.dumps.categories.slice(0, 5).map((k) => (
                  <li key={k.category} className="flex justify-between gap-3">
                    <span>{k.label}</span>
                    <span className="ck-num font-semibold">{int(k.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-3">
          <h2 className="ck-h2">Karta</h2>
          {dumps.data && outlines.data && facilities.data ? (
            <DumpMap
              dumps={dumps.data}
              facilities={facilities.data}
              outline={outline}
              center={c.center}
              zoom={10}
              fitBbox={c.bbox}
              cluster={dumps.data.features.length > 300}
              ariaLabel={`Karta odbačenog otpada i objekata za ${c.name}`}
            />
          ) : (
            <div className="ck-map h-[460px] animate-pulse" />
          )}
          <p className="ck-muted text-sm">
            Točke: crvena = otpad na lokaciji, žuta = prijavili građani, zelena = uklonjeno. Plavo =
            reciklažno dvorište, ljubičasto = sortirnica, smeđe = odlagalište, ružičasto = otpad u
            špilji ili jami.
          </p>
        </div>
        <aside className="grid content-start gap-4">
          <div className="ck-card ck-card-pad">
            <h2 className="font-semibold">Susjedi</h2>
            <p className="ck-muted mt-1 text-sm">
              {better === 0
                ? 'Odvaja više od svih susjednih općina.'
                : `${better} od ${c.neighbours.length} susjednih jedinica odvaja više.`}
            </p>
            <ul className="mt-3 grid gap-2">
              {[...c.neighbours, { mb: c.mb, name: c.name, sep_2022: s.rate_2022 }]
                .sort((a, b) => (b.sep_2022 ?? -1) - (a.sep_2022 ?? -1))
                .map((n) => (
                  <li key={n.mb} className="grid grid-cols-[1fr_5rem_3.5rem] items-center gap-2">
                    {n.mb === c.mb ? (
                      <strong>{n.name}</strong>
                    ) : (
                      <Link to={`/opcina/${n.mb}`} className="hover:underline">
                        {n.name}
                      </Link>
                    )}
                    <span className="ck-bar">
                      <span
                        style={{
                          width: `${Math.max(2, n.sep_2022 ?? 0)}%`,
                          background: rateColor(n.sep_2022),
                        }}
                      />
                    </span>
                    <span
                      className={`ck-num text-right text-sm ${n.mb === c.mb ? 'font-semibold' : ''}`}
                    >
                      {pct(n.sep_2022)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="ck-card ck-card-pad">
            <h2 className="flex items-center gap-2 font-semibold">
              <RecycleIcon className="text-[#0EA5E9]" /> Reciklažna dvorišta
            </h2>
            <ul className="mt-3 grid gap-3">
              {c.recycling_yards_nearest.map((f) => (
                <li key={f.id} className="grid grid-cols-[1fr_auto] gap-2">
                  <span>
                    <span className="block font-medium">{f.name}</span>
                    <span className="block text-sm text-[#5b6662]">{f.address}</span>
                  </span>
                  <span className="ck-num text-sm">{distance(f.distance_m)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[#5b6662]">
              Najbliža središtu jedinice, popis iz 2018.
            </p>
            {c.facilities.filter((f) => f.kind !== 'recycling_yard').length > 0 ? (
              <>
                <h3 className="mt-4 text-sm font-semibold">Na području jedinice</h3>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {c.facilities
                    .filter((f) => f.kind !== 'recycling_yard')
                    .slice(0, 8)
                    .map((f) => (
                      <li key={f.id}>
                        <span className="text-[#5b6662]">{f.kind_label}:</span>{' '}
                        {f.name ?? 'bez naziva'}
                        {f.status ? <span className="text-[#5b6662]"> ({f.status})</span> : null}
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
          </div>
        </aside>
      </section>

      {c.dumps.with_photos.length > 0 ? (
        <section aria-labelledby="ph-h">
          <h2 id="ph-h" className="ck-h2">
            Fotografije iz evidencije
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {c.dumps.with_photos.map((d) => (
              <figure key={d.id} className="m-0 grid gap-1.5">
                <Photo src={d.photos[0]!} alt={d.description ?? d.category_label} />
                <figcaption className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{d.settlement ?? d.category_label}</span>
                  <StatusChip status={d.status} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <p className="ck-muted text-sm">
        Stope odvajanja: „JLS, stopa odvajanja komunalnog otpada u okviru javne usluge” 2022. i
        „JLS, stopa odvajanja poticajna” 2019. Stopa recikliranja: „Županije, stopa recikliranja
        komunalnog otpada” 2022. Izvor: Ministarstvo zaštite okoliša i energetike.{' '}
        <Link to="/metodologija" className="inline-flex items-center gap-1 underline">
          Kako računamo <ArrowIcon width={14} height={14} />
        </Link>
      </p>
    </div>
  );
}
