import { ErrorState } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DumpCard } from '../components/bits';
import { DumpMap, FACILITY_COLOR } from '../components/DumpMap';
import { api } from '../lib/api';
import { int, STATUS_COLOR, STATUS_TEXT } from '../lib/format';
import type { DumpCollection, DumpStatus } from '../lib/types';

const KINDS: { kind: string; label: string }[] = [
  { kind: 'recycling_yard', label: 'Reciklažna dvorišta (2018.)' },
  { kind: 'cave_dump', label: 'Otpad u špiljama i jamama (2025.)' },
];

export function MapPage() {
  const dumps = useQuery({
    queryKey: ['dumps', ''],
    queryFn: ({ signal }) => api.dumps(undefined, signal),
  });
  const facilities = useQuery({
    queryKey: ['facilities'],
    queryFn: ({ signal }) => api.facilities(signal),
  });
  const [statuses, setStatuses] = useState<DumpStatus[]>(['on_site', 'reported', 'removed']);
  const [kinds, setKinds] = useState<string[]>(['recycling_yard']);
  const [selected, setSelected] = useState<number | null>(null);
  const [facility, setFacility] = useState<Record<string, unknown> | null>(null);
  const detail = useQuery({
    queryKey: ['dump', selected],
    queryFn: ({ signal }) => api.dump(selected as number, signal),
    enabled: selected != null,
  });

  const filtered: DumpCollection | undefined = useMemo(
    () =>
      dumps.data && {
        ...dumps.data,
        features: dumps.data.features.filter((f) => statuses.includes(f.properties.status)),
      },
    [dumps.data, statuses],
  );

  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="ck-wrap grid gap-6 pt-8">
      <header>
        <h1 className=" text-[2rem] sm:text-[2.75rem]">Cijela Hrvatska na jednoj karti</h1>
        <p className="ck-muted mt-2 max-w-3xl">
          {dumps.data ? int(dumps.data.features.length) : '…'} lokacija iz službene Evidencije
          lokacija odbačenog otpada, uz objekte za gospodarenje otpadom. Približi kartu i klikni
          točku za fotografiju i opis.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Status lokacije">
            {(Object.keys(STATUS_TEXT) as DumpStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={statuses.includes(s)}
                onClick={() => setStatuses((l) => toggle(l, s))}
                className={`ck-chip min-h-[40px] border border-[#111] px-3 ${statuses.includes(s) ? 'bg-white' : 'bg-transparent opacity-50'}`}
              >
                <span className="ck-dot" style={{ background: STATUS_COLOR[s] }} />
                {STATUS_TEXT[s]}
              </button>
            ))}
          </div>
          {filtered && facilities.data ? (
            <DumpMap
              dumps={filtered}
              facilities={facilities.data}
              facilityKinds={kinds}
              center={[16.3, 44.7]}
              zoom={6.3}
              fitBbox={[13.3, 42.35, 19.5, 46.6]}
              cluster
              height="h-[560px] lg:h-[680px]"
              ariaLabel="Karta odbačenog otpada u Hrvatskoj"
              onSelectDump={(id) => {
                setFacility(null);
                setSelected(id);
              }}
              onSelectFacility={(p) => {
                setSelected(null);
                setFacility(p);
              }}
            />
          ) : dumps.isError ? (
            <ErrorState message={dumps.error.message} onRetry={() => void dumps.refetch()} />
          ) : (
            <div className="ck-map h-[560px] animate-pulse" />
          )}
        </div>
        <aside className="grid content-start gap-4">
          <fieldset className="border-t border-[#111] pt-3">
            <legend className="sr-only">Objekti na karti</legend>
            <p className="mb-2 font-semibold">Objekti na karti</p>
            <div className="grid gap-2">
              {KINDS.map((k) => (
                <label
                  key={k.kind}
                  className="flex min-h-[32px] cursor-pointer items-center gap-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={kinds.includes(k.kind)}
                    onChange={() => setKinds((l) => toggle(l, k.kind))}
                    className="h-4 w-4 accent-[#111]"
                  />
                  <span className="ck-dot" style={{ background: FACILITY_COLOR[k.kind] }} />
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>
          {selected != null ? (
            detail.data ? (
              <div>
                <DumpCard d={detail.data} />
                {detail.data.mb ? (
                  <Link
                    to={`/opcina/${detail.data.mb}`}
                    className="ck-btn ck-btn--ghost mt-3 w-full"
                  >
                    {detail.data.municipality}: kartica
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="ck-card h-64 animate-pulse" />
            )
          ) : facility ? (
            <div className="ck-card ck-card-pad grid gap-1.5">
              <span className="text-[#5f5f5f]">{String(facility.kind_label)}</span>
              <span className="text-lg font-semibold">{String(facility.name ?? 'bez naziva')}</span>
              {facility.address ? (
                <span className="text-sm">{String(facility.address)}</span>
              ) : null}
              {facility.operator && facility.operator !== facility.name ? (
                <span className="ck-muted text-sm">{String(facility.operator)}</span>
              ) : null}
              {facility.status ? (
                <span className="text-sm">Status: {String(facility.status)}</span>
              ) : null}
              {typeof facility.url === 'string' && facility.url ? (
                <a
                  href={facility.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                >
                  Više o objektu
                </a>
              ) : null}
              <span className="ck-muted text-xs">Podatak iz sloja za {String(facility.year)}.</span>
            </div>
          ) : (
            <p className="ck-card ck-card-pad ck-muted text-sm">
              Klikni točku na karti. Brojke u krugovima su grupirane lokacije: klik ih rastvara.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
