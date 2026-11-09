import { MapView } from '@dt/ui';
import { useQuery } from '@tanstack/react-query';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { int, pct, STATUS_COLOR } from '../lib/format';
import { CROATIA_BOUNDS, localizeLabels } from '../lib/map';
import type { Overview } from '../lib/types';
import { useInView } from './motion';
import { POSITRON } from './RateMap';

type Bounds = [number, number, number, number];
type Look = 'ink' | 'status' | 'reported' | 'faint';

interface Step {
  big: string;
  body: ReactNode;
  camera: 'hr' | 'top';
  dots: Look;
  empty: boolean;
}

const BY_STATUS = [
  'match',
  ['get', 'status'],
  'on_site',
  STATUS_COLOR.on_site,
  'reported',
  STATUS_COLOR.reported,
  'removed',
  STATUS_COLOR.removed,
  '#999',
];

const DOT_COLOR: Record<Look, unknown> = {
  ink: '#111111',
  status: BY_STATUS,
  reported: ['case', ['==', ['get', 'status'], 'reported'], STATUS_COLOR.reported, '#c9c9c9'],
  faint: '#c9c9c9',
};

function reduced(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : true;
}

function bboxOf(geom: GeoJSON.Geometry): Bounds {
  const b: Bounds = [180, 90, -180, -90];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as [number, number];
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x);
      b[3] = Math.max(b[3], y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  if ('coordinates' in geom) walk(geom.coordinates);
  return b;
}

function steps(o: Overview): Step[] {
  const { top, rest, municipalities_without_dumps: empty } = o.story;
  const total = o.dumps.total;
  return [
    {
      big: int(total),
      body: (
        <>
          lokacija odbačenog otpada upisano je u službenu evidenciju. Svaka točka na karti je jedna
          lokacija.
        </>
      ),
      camera: 'hr',
      dots: 'ink',
      empty: false,
    },
    {
      big: pct((100 * top.total) / total),
      body: (
        <>
          njih je u jednom gradu: {top.name} ({int(top.total)}). Zagreb lokacije sustavno upisuje, a
          većina ostalih jedinica ne.
        </>
      ),
      camera: 'top',
      dots: 'ink',
      empty: false,
    },
    {
      big: pct(top.removed_share),
      body: (
        <>
          zagrebačkih lokacija evidencija vodi kao uklonjeno ({int(top.removed)}).{' '}
          <Swatch s="removed" /> zeleno: označeno kao uklonjeno, <Swatch s="on_site" /> crveno:
          otpad na lokaciji, <Swatch s="reported" /> žuto: prijavili građani. Status upisuje onaj
          tko vodi evidenciju; na terenu ga ne provjeravamo.
        </>
      ),
      camera: 'top',
      dots: 'status',
      empty: false,
    },
    {
      big: int(rest.reported),
      body: (
        <>
          od {int(rest.total)} lokacija izvan Zagreba prijavili su građani, čak{' '}
          {pct((100 * rest.reported) / rest.total)}. U Zagrebu taj je udio{' '}
          {pct((100 * top.reported) / top.total)}. Izvan Zagreba kao uklonjeno označeno je samo{' '}
          {pct(rest.removed_share)} lokacija.
        </>
      ),
      camera: 'hr',
      dots: 'reported',
      empty: false,
    },
    {
      big: int(empty),
      body: (
        <>
          od {int(o.separation.municipalities)} općina i gradova nema nijednu upisanu lokaciju
          (tamno na karti). To ne znači da su čiste, nego da ih nitko ne upisuje.
        </>
      ),
      camera: 'hr',
      dots: 'faint',
      empty: true,
    },
  ];
}

function Swatch({ s }: { s: keyof typeof STATUS_COLOR }) {
  return <span className="ck-dot align-middle" style={{ background: STATUS_COLOR[s] }} />;
}

/** Scrolly story: a pinned map of all register entries that changes as the reader passes each step. */
export function Story({ overview }: { overview: Overview }) {
  const [sectionRef, near] = useInView<HTMLElement>('600px 0px 600px 0px');
  const dumps = useQuery({
    queryKey: ['dumps', ''],
    queryFn: ({ signal }) => api.dumps(undefined, signal),
    enabled: near,
  });
  const outlines = useQuery({
    queryKey: ['outlines'],
    queryFn: ({ signal }) => api.outlines(signal),
    enabled: near,
  });
  const list = useMemo(() => steps(overview), [overview]);
  const [active, setActive] = useState(0);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const topBounds = useMemo(() => {
    const f = outlines.data?.features.find((x) => x.properties.mb === overview.story.top.mb);
    return f ? bboxOf(f.geometry) : null;
  }, [outlines.data, overview.story.top.mb]);

  // Which step is in the reading line (a band a little below the middle of the screen).
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: '-55% 0px -40% 0px' },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [list.length]);

  // Data layers, once both the map and the data are there.
  useEffect(() => {
    if (!map || !dumps.data || !outlines.data || map.getSource('dots')) return;
    map.addSource('mun', { type: 'geojson', data: outlines.data });
    map.addSource('dots', { type: 'geojson', data: dumps.data });
    const firstSymbol = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
    map.addLayer(
      {
        id: 'mun-empty',
        type: 'fill',
        source: 'mun',
        filter: ['==', ['get', 'dumps'], 0],
        paint: {
          'fill-color': '#111111',
          'fill-opacity': 0,
          'fill-opacity-transition': { duration: 700 },
        },
      },
      firstSymbol,
    );
    map.addLayer({
      id: 'mun-top',
      type: 'line',
      source: 'mun',
      filter: ['==', ['get', 'mb'], overview.story.top.mb],
      paint: { 'line-color': '#111111', 'line-width': 1.5, 'line-dasharray': [2, 1] },
    });
    map.addLayer({
      id: 'dots',
      type: 'circle',
      source: 'dots',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.6, 9, 2.2, 12, 3.5],
        'circle-color': '#111111',
        'circle-color-transition': { duration: 600 },
        'circle-opacity': 0.85,
      },
    });
  }, [map, dumps.data, outlines.data, overview.story.top.mb]);

  // Apply the active step: camera, dot colours, empty municipalities.
  useEffect(() => {
    const s = list[active];
    if (!map || !s || !map.getLayer('dots')) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.setPaintProperty('dots', 'circle-color', DOT_COLOR[s.dots] as any);
    map.setPaintProperty('mun-empty', 'fill-opacity', s.empty ? 0.55 : 0);
    const b = s.camera === 'top' && topBounds ? topBounds : CROATIA_BOUNDS;
    map.fitBounds(b, { padding: 24, duration: reduced() ? 0 : 1600, essential: false });
  }, [active, map, list, topBounds, dumps.data, outlines.data]);

  function onLoad(m: MapLibreMap) {
    localizeLabels(m);
    m.scrollZoom.disable();
    m.fitBounds(CROATIA_BOUNDS, { padding: 24, duration: 0 });
    setMap(m);
  }

  return (
    <section ref={sectionRef} aria-labelledby="story-h" className="ck-scrolly">
      <h2 id="story-h" className="ck-h2">
        Što zapravo piše u evidenciji
      </h2>
      <div className="ck-scrolly-grid">
        <div className="ck-scrolly-map">
          <div className="ck-map h-full">
            <MapView
              styleUrl={POSITRON}
              className="h-full"
              ariaLabel="Karta svih upisanih lokacija odbačenog otpada"
              onLoad={onLoad}
            />
          </div>
        </div>
        <div className="ck-scrolly-steps">
          {list.map((s, i) => (
            <div
              key={i}
              data-step={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className={`ck-step ${i === active ? 'is-active' : ''}`}
            >
              <p className="ck-step-big ck-num">{s.big}</p>
              <p className="ck-step-body">{s.body}</p>
            </div>
          ))}
          <div className="ck-step ck-step--end">
            <Link to="/karta" className="ck-btn">
              Otvori cijelu kartu
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
