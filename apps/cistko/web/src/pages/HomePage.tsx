import { ErrorState, LoadingSkeleton } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CompareBars } from '../components/bits';
import { RateMap } from '../components/RateMap';
import { AddressSearch, MunicipalitySearch } from '../components/Searches';
import { api } from '../lib/api';
import { fullName, int, pct, photoUrl, STATUS_COLOR, STATUS_TEXT } from '../lib/format';
import type { Dump, LeagueRow } from '../lib/types';

function MiniLeague({ title, rows }: { title: string; rows: LeagueRow[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <table className="ck-table mt-1">
        <tbody>
          {rows.map((r) => (
            <tr key={r.mb}>
              <td className="ck-num ck-muted w-10">{r.rank_hr}.</td>
              <td>
                <Link to={`/opcina/${r.mb}`}>{fullName(r.kind, r.name)}</Link>
                <span className="ck-muted block text-sm">{r.county}</span>
              </td>
              <td className="ck-num text-right font-semibold">{pct(r.sep_2022)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Caption({ d }: { d: Dump }) {
  return (
    <>
      <strong className="font-semibold text-[#111]">{d.municipality}</strong>
      {d.settlement && d.settlement !== d.municipality ? `, ${d.settlement}` : ''} ·{' '}
      <span className="inline-flex items-center gap-1">
        <span className="ck-dot" style={{ background: STATUS_COLOR[d.status] }} />
        {STATUS_TEXT[d.status]}
      </span>
    </>
  );
}

export function HomePage() {
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: ({ signal }) => api.overview(signal),
  });
  const outlines = useQuery({
    queryKey: ['outlines'],
    queryFn: ({ signal }) => api.outlines(signal),
  });
  const league = useQuery({ queryKey: ['league'], queryFn: ({ signal }) => api.league(signal) });
  const photos = useQuery({
    queryKey: ['photos', 5],
    queryFn: ({ signal }) => api.photos(5, signal),
  });
  const o = overview.data;
  const items = photos.data?.items ?? [];
  const lead = items[0];
  const more = items.slice(1, 5);

  return (
    <div className="ck-wrap grid gap-14 pt-8">
      <section className="grid gap-8 border-b border-[#111] pb-10 lg:grid-cols-[1fr_1.05fr]">
        <div className="grid content-start gap-6">
          <h1 className="text-[2.4rem] sm:text-[3.5rem]">Gdje je smeće i tko ga čisti?</h1>
          {o ? (
            <div className="ck-story grid gap-4">
              <p className="ck-lead">
                U službenoj evidenciji odbačenog otpada upisano je{' '}
                <strong className="ck-num">{int(o.dumps.total)}</strong> lokacija. Uklonjeno je{' '}
                <strong className="ck-num">{int(o.dumps.removed)}</strong>, odnosno{' '}
                {pct(o.dumps.removed_share)}.
              </p>
              <p>
                Tipična općina pritom odvaja tek {pct(o.separation.median_2022)} komunalnog otpada
                (2019. bilo je {pct(o.separation.median_2019)}), a barem polovinu odvaja{' '}
                {int(o.separation.at_least_50)} od {int(o.separation.municipalities)} općina i
                gradova.
              </p>
            </div>
          ) : overview.isError ? (
            <ErrorState message={overview.error.message} onRetry={() => void overview.refetch()} />
          ) : (
            <div className="h-40" />
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <AddressSearch />
              <p className="ck-muted mt-1.5 text-sm">
                Prijave u blizini, s fotografijama.{' '}
                <Link to="/adresa?lat=44.86431&lon=13.84397&q=Pula">Primjer: Pula</Link>
              </p>
            </div>
            <div>
              <MunicipalitySearch />
              <p className="ck-muted mt-1.5 text-sm">Odvajanje, poredak i očišćeno.</p>
            </div>
          </div>
        </div>
        {lead ? (
          <figure className="ck-lead-photo">
            <img src={photoUrl(lead.photos[0]!)} alt={lead.description ?? lead.category_label} />
            <figcaption className="ck-caption">
              <Caption d={lead} /> Fotografija iz Evidencije lokacija odbačenog otpada.
            </figcaption>
          </figure>
        ) : (
          <div className="ck-lead-photo" aria-hidden="true">
            <div className="aspect-[4/3] bg-[#f4f2ee]" />
          </div>
        )}
      </section>

      {more.length > 0 ? (
        <section aria-labelledby="ph-h">
          <h2 id="ph-h" className="ck-h2">
            Još iz evidencije
          </h2>
          <div className="ck-strip mt-4">
            {more.map((d) => (
              <figure key={d.id}>
                <img
                  src={photoUrl(d.photos[0]!)}
                  alt={d.description ?? d.category_label}
                  loading="lazy"
                />
                <figcaption className="ck-caption">
                  <Caption d={d} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="map-h" className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid content-start gap-3">
          <h2 id="map-h" className="ck-h2">
            Odvajanje otpada po općinama, 2022.
          </h2>
          <p className="ck-muted">
            Udio odvojeno prikupljenog komunalnog otpada u javnoj usluzi. Tamnije znači više. Klikni
            općinu za njezinu karticu.
          </p>
          {outlines.data ? (
            <RateMap data={outlines.data} height="h-[440px] lg:h-[520px]" />
          ) : outlines.isError ? (
            <ErrorState message={outlines.error.message} onRetry={() => void outlines.refetch()} />
          ) : (
            <div className="ck-map h-[440px]" />
          )}
        </div>
        <aside className="grid content-start gap-8">
          {league.data ? (
            <>
              <MiniLeague title="Najviše odvajaju" rows={league.data.items.slice(0, 5)} />
              <MiniLeague title="Najmanje odvajaju" rows={league.data.items.slice(-5).reverse()} />
              <Link to="/liga">Svih 556 općina i gradova</Link>
            </>
          ) : (
            <LoadingSkeleton lines={8} label="Učitavam ligu…" />
          )}
        </aside>
      </section>

      {o ? (
        <section className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="ck-h2">Nijedna županija ne reciklira 55 %</h2>
            <p className="ck-muted mb-5 mt-1">
              Stopa recikliranja komunalnog otpada po županijama, 2022. Okomita crta je cilj EU za
              2025. (Direktiva 2018/851).
            </p>
            <CompareBars
              rows={o.counties.map((c) => ({
                label: c.name,
                value: c.recycling_2022,
                strong: true,
              }))}
              target={{ value: 55, label: 'Cilj EU za 2025.: 55 %' }}
            />
          </div>
          <div>
            <h2 className="ck-h2">Što se najčešće odbacuje</h2>
            <table className="ck-table mt-4">
              <tbody>
                {o.dumps.categories.map((c) => (
                  <tr key={c.category}>
                    <td>{c.label}</td>
                    <td className="ck-num text-right font-semibold">{int(c.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ck-inset mt-6">
              {int(o.dumps.top_municipality.count)} od {int(o.dumps.total)} lokacija (
              {pct((100 * o.dumps.top_municipality.count) / o.dumps.total)}) upisano je za{' '}
              {o.dumps.top_municipality.name}. Neke jedinice sustavno upisuju lokacije, a većina ne,
              pa broj lokacija pokazuje koliko se prijavljuje, a ne koliko je stvarno smeća.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
