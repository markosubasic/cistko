import { useEffect, useRef, useState, type ReactNode } from 'react';
import { distance, mass, pct, photoUrl, rateColor, STATUS_COLOR, STATUS_TEXT } from '../lib/format';
import type { Dump, DumpStatus } from '../lib/types';

export function StatusChip({ status }: { status: DumpStatus }) {
  return (
    <span className="ck-chip px-0">
      <span className="ck-dot" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_TEXT[status]}
    </span>
  );
}

/** Horizontal comparison bars of percentages with an optional target line. */
export function CompareBars({
  rows,
  target,
}: {
  rows: { label: ReactNode; value: number | null; strong?: boolean }[];
  target?: { value: number; label: string };
}) {
  return (
    <div className="grid gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(7rem,11rem)_1fr_3.75rem] items-center gap-3">
          <span className={r.strong ? '' : 'text-[#5f5f5f]'}>{r.label}</span>
          <span className="ck-bar">
            <span
              style={{
                width: `${Math.max(1, r.value ?? 0)}%`,
                background: r.strong ? rateColor(r.value) : '#b1b4b6',
              }}
            />
            {target ? (
              <span className="ck-tick" style={{ left: `${target.value}%` }} title={target.label} />
            ) : null}
          </span>
          <span className={`ck-num text-right ${r.strong ? 'font-semibold' : ''}`}>
            {pct(r.value)}
          </span>
        </div>
      ))}
      {target ? (
        <p className="text-sm text-[#5f5f5f]">
          <span className="mr-1.5 inline-block h-3 w-0.5 translate-y-0.5 bg-[#111]" />
          {target.label}
        </p>
      ) : null}
    </div>
  );
}

/** Photo with a click-to-enlarge dialog. */
export function Photo({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="ck-photo block w-full"
        onClick={() => setOpen(true)}
        aria-label={`Povećaj fotografiju: ${alt}`}
      >
        <img src={photoUrl(src)} alt={alt} loading="lazy" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={() => setOpen(false)}
        className="max-h-[92vh] max-w-[92vw] bg-transparent p-0 backdrop:bg-black/80"
      >
        {open ? <img src={photoUrl(src)} alt={alt} className="max-h-[90vh] max-w-[90vw]" /> : null}
      </dialog>
    </>
  );
}

/** One dump site: photo (if any), status, category, place, quantities, description. */
export function DumpCard({ d }: { d: Dump; compact?: boolean }) {
  const photo = d.photos[0];
  return (
    <article className="ck-card">
      {photo ? <Photo src={photo} alt={d.description ?? d.category_label} /> : null}
      <div className="grid gap-1.5 p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <StatusChip status={d.status} />
          {d.distance_m != null ? (
            <span className="text-[#5f5f5f]">{distance(d.distance_m)}</span>
          ) : null}
        </div>
        <p className="font-semibold">
          {d.category_label}
          {d.settlement ? (
            <span className="font-normal text-[#5f5f5f]"> · {d.settlement}</span>
          ) : null}
        </p>
        {d.description ? <p className="line-clamp-3 text-[#111]">{d.description}</p> : null}
        {d.qty_kg || d.volume_m3 ? (
          <p className="text-sm text-[#5f5f5f]">
            Procjena: {d.qty_kg ? mass(d.qty_kg) : ''}
            {d.qty_kg && d.volume_m3 ? ', ' : ''}
            {d.volume_m3 ? `${d.volume_m3.toLocaleString('hr-HR')} m³` : ''}
          </p>
        ) : null}
      </div>
    </article>
  );
}
