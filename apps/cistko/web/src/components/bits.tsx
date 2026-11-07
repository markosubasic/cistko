import { useEffect, useRef, useState, type ReactNode } from 'react';
import { distance, mass, pct, rateColor, STATUS_COLOR, STATUS_TEXT } from '../lib/format';
import type { Dump, DumpStatus } from '../lib/types';
import { CameraIcon } from './icons';

export function StatusChip({ status }: { status: DumpStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="ck-chip" style={{ background: `${color}1f`, color: '#13201d' }}>
      <span className="ck-dot" style={{ background: color }} />
      {STATUS_TEXT[status]}
    </span>
  );
}

/** Number that counts up once when it first scrolls into view (static under reduced motion). */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / 1100);
        setShown(value * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, reduce]);
  return (
    <span ref={ref} className="ck-num">
      {format(shown)}
    </span>
  );
}

/** Semicircle gauge for a percentage (0–100) with optional reference ticks. */
export function RateGauge({
  value,
  ticks = [],
  size = 220,
  label,
}: {
  value: number | null;
  ticks?: { value: number; label: string }[];
  size?: number;
  label: string;
}) {
  const r = 80;
  const cx = 100;
  const cy = 96;
  const arc = (v: number) => {
    const a = Math.PI * (1 - Math.max(0, Math.min(100, v)) / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const [ex, ey] = arc(value ?? 0);
  const large = 0;
  const color = rateColor(value);
  return (
    <figure className="m-0 grid place-items-center" aria-label={`${label}: ${pct(value)}`}>
      <svg width={size} height={size * 0.6} viewBox="0 0 200 120" role="img" aria-hidden="true">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#ece9e1"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {value != null && value > 0 ? (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
          />
        ) : null}
        {ticks.map((t) => {
          const [x1, y1] = arc(t.value);
          const a = Math.PI * (1 - t.value / 100);
          const x2 = cx + (r + 16) * Math.cos(a);
          const y2 = cy - (r + 16) * Math.sin(a);
          return (
            <g key={t.label}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0F2E2A" strokeWidth="2" />
            </g>
          );
        })}
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          fontSize="34"
          fontWeight="600"
          fill="#13201d"
          style={{ letterSpacing: '-0.04em' }}
        >
          {value == null ? '–' : `${value.toLocaleString('hr-HR', { maximumFractionDigits: 1 })}`}
          <tspan fontSize="18" dx="2">
            %
          </tspan>
        </text>
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="#5b6662">
          {label}
        </text>
      </svg>
    </figure>
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
  const max = 100;
  return (
    <div className="grid gap-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(7rem,11rem)_1fr_3.5rem] items-center gap-3">
          <span className={r.strong ? 'font-semibold' : 'text-[#5b6662]'}>{r.label}</span>
          <span className="ck-bar">
            <span
              style={{
                width: `${Math.max(1, ((r.value ?? 0) / max) * 100)}%`,
                background: r.strong ? rateColor(r.value) : '#b9c4bf',
              }}
            />
            {target ? (
              <span
                className="ck-tick"
                style={{ left: `${(target.value / max) * 100}%` }}
                title={target.label}
              />
            ) : null}
          </span>
          <span className={`ck-num text-right ${r.strong ? 'font-semibold' : ''}`}>
            {pct(r.value)}
          </span>
        </div>
      ))}
      {target ? (
        <p className="text-xs text-[#5b6662]">
          <span className="mr-1 inline-block h-3 w-0.5 translate-y-0.5 bg-[#0F2E2A]" />
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
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={() => setOpen(false)}
        className="max-h-[92vh] max-w-[92vw] rounded-2xl bg-transparent p-0 backdrop:bg-black/80"
      >
        {open ? (
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </dialog>
    </>
  );
}

/** One dump site: photo (if any), status, category, place, quantities, description. */
export function DumpCard({ d, compact }: { d: Dump; compact?: boolean }) {
  const photo = d.photos[0];
  return (
    <article className="ck-card overflow-hidden">
      {photo ? (
        <Photo src={photo} alt={d.description ?? d.category_label} />
      ) : compact ? null : (
        <div className="grid aspect-[4/3] place-items-center bg-[#efede6] text-[#8a938f]">
          <span className="flex items-center gap-2 text-sm">
            <CameraIcon /> Bez fotografije
          </span>
        </div>
      )}
      <div className="grid gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={d.status} />
          {d.distance_m != null ? (
            <span className="ck-chip bg-[#efede6]">{distance(d.distance_m)}</span>
          ) : null}
        </div>
        <p className="font-semibold leading-snug">
          {d.category_label}
          {d.settlement ? (
            <span className="font-normal text-[#5b6662]"> · {d.settlement}</span>
          ) : null}
        </p>
        {d.description ? (
          <p className="line-clamp-3 text-sm text-[#3d4845]">{d.description}</p>
        ) : null}
        {d.qty_kg || d.volume_m3 ? (
          <p className="text-sm text-[#5b6662]">
            Procjena: {d.qty_kg ? mass(d.qty_kg) : ''}
            {d.qty_kg && d.volume_m3 ? ', ' : ''}
            {d.volume_m3 ? `${d.volume_m3.toLocaleString('hr-HR')} m³` : ''}
          </p>
        ) : null}
      </div>
    </article>
  );
}
