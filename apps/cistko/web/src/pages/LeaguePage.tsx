import { ErrorState, LoadingSkeleton } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fullName, int, pct, rateColor, signedPp } from '../lib/format';
import type { LeagueRow } from '../lib/types';

type SortKey = 'sep_2022' | 'change_pp' | 'dumps' | 'removed_share';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'sep_2022', label: 'Odvajanje 2022.' },
  { key: 'change_pp', label: 'Napredak od 2019.' },
  { key: 'dumps', label: 'Upisane lokacije' },
  { key: 'removed_share', label: 'Udio uklonjenog' },
];

const removedShare = (r: LeagueRow) => (r.dumps > 0 ? (100 * r.removed) / r.dumps : null);

export function LeaguePage() {
  const league = useQuery({ queryKey: ['league'], queryFn: ({ signal }) => api.league(signal) });
  const [county, setCounty] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('sep_2022');
  const [limit, setLimit] = useState(60);

  const counties = useMemo(
    () =>
      [...new Set((league.data?.items ?? []).map((r) => r.county))].sort((a, b) =>
        a.localeCompare(b, 'hr'),
      ),
    [league.data],
  );
  const rows = useMemo(() => {
    const items = (league.data?.items ?? []).filter(
      (r) =>
        (!county || r.county === county) &&
        (!q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())),
    );
    const val = (r: LeagueRow): number | null =>
      sort === 'removed_share' ? removedShare(r) : sort === 'dumps' ? r.dumps : r[sort];
    return [...items].sort((a, b) => (val(b) ?? -Infinity) - (val(a) ?? -Infinity));
  }, [league.data, county, q, sort]);

  return (
    <div className="ck-wrap grid gap-6 pt-8">
      <header>
        <h1 className="text-[2rem] sm:text-[2.75rem]">Tko odvaja najviše otpada?</h1>
        <p className="ck-muted mt-2 max-w-3xl">
          Svih 556 općina i gradova po udjelu odvojeno prikupljenog komunalnog otpada u javnoj
          usluzi (2022.), s promjenom od 2019. i stanjem upisanih lokacija odbačenog otpada.
        </p>
      </header>
      <div className="ck-card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-[#b1b4b6] p-4">
          <label className="grid gap-1 text-sm font-semibold">
            Županija
            <select
              value={county}
              onChange={(e) => {
                setCounty(e.target.value);
                setLimit(60);
              }}
              className="min-h-[44px] border border-[#111] bg-white px-3 font-normal"
            >
              <option value="">Sve županije</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="grid flex-1 gap-1 text-sm font-semibold">
            Traži
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ime općine ili grada"
              className="min-h-[44px] border border-[#111] px-3 font-normal"
            />
          </label>
          <div className="ck-seg flex-wrap" role="group" aria-label="Poredaj po">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {league.isPending ? (
          <div className="p-4">
            <LoadingSkeleton lines={8} label="Učitavam ligu…" />
          </div>
        ) : league.isError ? (
          <div className="p-4">
            <ErrorState message={league.error.message} onRetry={() => void league.refetch()} />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="ck-table">
              <caption className="dt-sr-only">Liga općina po odvajanju otpada</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Općina / grad</th>
                  <th scope="col" className="w-[30%]">
                    Odvajanje 2022.
                  </th>
                  <th scope="col">Od 2019.</th>
                  <th scope="col">Lokacije</th>
                  <th scope="col">Uklonjeno</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r) => (
                  <tr key={r.mb}>
                    <td className="ck-num text-[#5f5f5f]">{r.rank_hr}.</td>
                    <td>
                      <Link to={`/opcina/${r.mb}`} className="font-medium hover:underline">
                        {fullName(r.kind, r.name)}
                      </Link>
                      <span className="block text-xs text-[#5f5f5f]">{r.county}</span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="ck-bar flex-1">
                          <span
                            style={{
                              width: `${Math.max(1, r.sep_2022 ?? 0)}%`,
                              background: rateColor(r.sep_2022),
                            }}
                          />
                        </span>
                        <span className="ck-num w-14 text-right font-semibold">
                          {pct(r.sep_2022)}
                        </span>
                      </span>
                    </td>
                    <td
                      className="ck-num"
                      style={{ color: (r.change_pp ?? 0) >= 0 ? '#13804A' : '#B42318' }}
                    >
                      {signedPp(r.change_pp)}
                    </td>
                    <td className="ck-num">{int(r.dumps)}</td>
                    <td className="ck-num">{r.dumps > 0 ? pct(removedShare(r)) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > limit ? (
              <div className="p-4 text-center">
                <button
                  type="button"
                  className="ck-btn ck-btn--ghost"
                  onClick={() => setLimit((n) => n + 100)}
                >
                  Prikaži još ({rows.length - limit})
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
