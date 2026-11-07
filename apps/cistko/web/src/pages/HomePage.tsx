import { ErrorState, LoadingSkeleton } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CompareBars, CountUp } from '../components/bits';
import { ArrowIcon, MapIcon, PinIcon, TrophyIcon } from '../components/icons';
import { RateMap } from '../components/RateMap';
import { AddressSearch, MunicipalitySearch } from '../components/Searches';
import { api } from '../lib/api';
import { dec1, fullName, int, pct, rateColor } from '../lib/format';

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
  const o = overview.data;

  return (
    <>
      <section className="ck-hero">
        <div className="ck-wrap relative z-[1] grid gap-10 pb-14 pt-12 sm:pt-16 lg:pb-16">
          <div className="max-w-3xl">
            <p className="ck-eyebrow !text-[#6ee7b7]">
              Otvoreni podaci Ministarstva zaštite okoliša
            </p>
            <h1 className="mt-3 text-[2.4rem] sm:text-[3.4rem]">
              Gdje je smeće <span className="ck-mint">i tko ga čisti?</span>
            </h1>
            <p className="ck-lead mt-4 max-w-2xl text-lg">
              Čistko na jednom mjestu pokazuje prijavljeni odbačeni otpad s fotografijama, koliko je
              od toga uklonjeno i koliko otpada odvaja svaka od 556 općina i gradova u Hrvatskoj.
            </p>
          </div>
          <div className="grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="ck-glass">
              <AddressSearch />
              <p className="mt-2 text-sm text-white/70">Što je odbačeno u krugu tvoje adrese</p>
            </div>
            <div className="ck-glass">
              <MunicipalitySearch />
              <p className="mt-2 text-sm text-white/70">
                Kartica općine: odvajanje, prijave, očišćeno
              </p>
            </div>
          </div>
          {o ? (
            <dl className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 lg:grid-cols-4">
              <div className="ck-stat">
                <dt className="ck-stat-label order-2">prijavljenih lokacija odbačenog otpada</dt>
                <dd className="ck-stat-value order-1 m-0">
                  <CountUp value={o.dumps.total} format={(n) => int(n)} />
                </dd>
              </div>
              <div className="ck-stat">
                <dt className="ck-stat-label order-2">
                  uklonjeno ({pct(o.dumps.removed_share)} prijavljenih)
                </dt>
                <dd className="ck-stat-value order-1 m-0 text-[#6ee7b7]">
                  <CountUp value={o.dumps.removed} format={(n) => int(n)} />
                </dd>
              </div>
              <div className="ck-stat">
                <dt className="ck-stat-label order-2">
                  otpada odvaja tipična općina (medijan 2022.; u 2019. bilo je{' '}
                  {pct(o.separation.median_2019)})
                </dt>
                <dd className="ck-stat-value order-1 m-0">
                  <CountUp value={o.separation.median_2022 ?? 0} format={(n) => `${dec1(n)} %`} />
                </dd>
              </div>
              <div className="ck-stat">
                <dt className="ck-stat-label order-2">
                  općina i gradova odvaja barem polovinu otpada
                </dt>
                <dd className="ck-stat-value order-1 m-0">
                  <CountUp value={o.separation.at_least_50} format={(n) => int(n)} />
                  <span className="text-xl text-white/60"> / {o.separation.municipalities}</span>
                </dd>
              </div>
            </dl>
          ) : overview.isError ? (
            <ErrorState message={overview.error.message} onRetry={() => void overview.refetch()} />
          ) : (
            <div className="h-24" />
          )}
        </div>
      </section>

      <div className="ck-wrap mt-10 grid gap-10">
        <section aria-labelledby="map-h" className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="grid gap-3">
            <div>
              <p className="ck-eyebrow">Odvajanje otpada, 2022.</p>
              <h2 id="map-h" className="ck-h2 mt-1">
                Sjever odvaja, jug zaostaje
              </h2>
              <p className="ck-muted mt-1">
                Udio odvojeno prikupljenog komunalnog otpada u javnoj usluzi za svaku općinu i grad.
                Klikni općinu za njezinu karticu.
              </p>
            </div>
            {outlines.data ? (
              <RateMap data={outlines.data} height="h-[440px] lg:h-[520px]" />
            ) : outlines.isError ? (
              <ErrorState
                message={outlines.error.message}
                onRetry={() => void outlines.refetch()}
              />
            ) : (
              <div className="ck-map h-[440px] animate-pulse" />
            )}
          </div>
          <aside className="grid content-start gap-4">
            <div className="ck-card ck-card-pad">
              <h3 className="flex items-center gap-2 font-semibold">
                <TrophyIcon className="text-[#047857]" /> Prvaci odvajanja
              </h3>
              {league.data ? (
                <ol className="mt-3 grid gap-2">
                  {league.data.items.slice(0, 5).map((r) => (
                    <li key={r.mb} className="flex items-center gap-3">
                      <span className="ck-num w-6 text-right text-[#5b6662]">{r.rank_hr}.</span>
                      <Link to={`/opcina/${r.mb}`} className="flex-1 font-medium hover:underline">
                        {fullName(r.kind, r.name)}
                        <span className="block text-xs font-normal text-[#5b6662]">{r.county}</span>
                      </Link>
                      <span className="ck-num font-semibold" style={{ color: '#13804A' }}>
                        {pct(r.sep_2022)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <LoadingSkeleton lines={5} label="Učitavam ligu…" />
              )}
            </div>
            <div className="ck-card ck-card-pad">
              <h3 className="font-semibold">Na začelju</h3>
              {league.data ? (
                <ol className="mt-3 grid gap-2">
                  {league.data.items
                    .slice(-5)
                    .reverse()
                    .map((r) => (
                      <li key={r.mb} className="flex items-center gap-3">
                        <span className="ck-num w-8 text-right text-[#5b6662]">{r.rank_hr}.</span>
                        <Link to={`/opcina/${r.mb}`} className="flex-1 font-medium hover:underline">
                          {fullName(r.kind, r.name)}
                          <span className="block text-xs font-normal text-[#5b6662]">
                            {r.county}
                          </span>
                        </Link>
                        <span
                          className="ck-num font-semibold"
                          style={{ color: rateColor(r.sep_2022) }}
                        >
                          {pct(r.sep_2022)}
                        </span>
                      </li>
                    ))}
                </ol>
              ) : (
                <LoadingSkeleton lines={5} label="Učitavam ligu…" />
              )}
              <Link to="/liga" className="ck-btn ck-btn--ghost mt-4 w-full">
                Cijela liga općina <ArrowIcon />
              </Link>
            </div>
          </aside>
        </section>

        {o ? (
          <section aria-labelledby="zup-h" className="grid gap-6 lg:grid-cols-2">
            <div className="ck-card ck-card-pad">
              <p className="ck-eyebrow">Županije, 2022.</p>
              <h2 id="zup-h" className="ck-h2 mt-1">
                Nijedna županija ne reciklira 55 %
              </h2>
              <p className="ck-muted mb-5 mt-1">
                Stopa recikliranja komunalnog otpada po županijama. EU traži barem 55 % pripreme za
                ponovnu uporabu i recikliranja do 2025. (Direktiva 2018/851).
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
            <div className="grid content-start gap-6">
              <div className="ck-card ck-card-pad">
                <p className="ck-eyebrow">Što se odbacuje</p>
                <h2 className="ck-h2 mt-1">Najčešće glomazni otpad</h2>
                <ul className="mt-4 grid gap-2.5">
                  {o.dumps.categories.map((c) => (
                    <li key={c.category} className="grid grid-cols-[1fr_auto] items-end gap-3">
                      <span className="block w-full">
                        {c.label}
                        <span className="ck-bar mt-1.5 block w-full">
                          <span
                            style={{
                              width: `${Math.max(1, (c.count / o.dumps.total) * 100)}%`,
                              background: '#0F2E2A',
                            }}
                          />
                        </span>
                      </span>
                      <span className="ck-num font-semibold">{int(c.count)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl bg-[#fff7e6] p-3 text-sm text-[#5c4300]">
                  {int(o.dumps.top_municipality.count)} od {int(o.dumps.total)} lokacija (
                  {pct((100 * o.dumps.top_municipality.count) / o.dumps.total)}) odnosi se na{' '}
                  {o.dumps.top_municipality.name}. Neke jedinice sustavno upisuju lokacije, a većina
                  ne, pa broj lokacija pokazuje koliko se prijavljuje, a ne koliko je stvarno smeća.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link to="/karta" className="ck-card ck-card-pad group grid gap-2 no-underline">
                  <MapIcon className="text-[#047857]" />
                  <span className="font-semibold">Karta odbačenog otpada</span>
                  <span className="ck-muted text-sm">
                    {int(o.dumps.total)} lokacija, {int(o.dumps.with_photo)} s fotografijom, uz
                    reciklažna dvorišta, odlagališta i otpad u špiljama.
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 font-semibold text-[#047857]">
                    Otvori kartu <ArrowIcon className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
                <Link
                  to="/adresa?lat=45.80610&lon=15.97870&q=Trg%20kralja%20Tomislava%2C%20Zagreb"
                  className="ck-card ck-card-pad group grid gap-2 no-underline"
                >
                  <PinIcon className="text-[#047857]" />
                  <span className="font-semibold">Oko tvoje adrese</span>
                  <span className="ck-muted text-sm">
                    Prijave u krugu adrese, najbliže reciklažno dvorište i kako stoji tvoja općina.
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 font-semibold text-[#047857]">
                    Primjer: Zagreb <ArrowIcon className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
