import { MapView } from '@dt/ui';
import { Popup, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pct, RATE_STEPS, rateExpression } from '../lib/format';
import { CROATIA_BOUNDS, localizeLabels } from '../lib/map';
import type { MunicipalityCollection } from '../lib/types';

export const POSITRON = 'https://tiles.openfreemap.org/styles/positron';

interface Props {
  data: MunicipalityCollection;
  height?: string;
  /** Municipality to outline and zoom to. */
  highlight?: string;
  bbox?: [number, number, number, number];
  ariaLabel?: string;
}

/** Choropleth of the 2022 separate-collection rate of all 556 municipalities; click opens the card. */
export function RateMap({ data, height = 'h-[420px]', highlight, bbox, ariaLabel }: Props) {
  const navigate = useNavigate();
  const mapRef = useRef<MapLibreMap | null>(null);
  const navRef = useRef(navigate);
  navRef.current = navigate;

  function onLoad(map: MapLibreMap) {
    mapRef.current = map;
    localizeLabels(map);
    map.addSource('mun', { type: 'geojson', data, promoteId: 'mb' });
    const firstSymbol = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
    map.addLayer(
      {
        id: 'mun-fill',
        type: 'fill',
        source: 'mun',
        paint: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'fill-color': rateExpression('sep_2022') as any,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.92, 0.72],
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: 'mun-line',
        type: 'line',
        source: 'mun',
        paint: { 'line-color': '#ffffff', 'line-width': 0.6, 'line-opacity': 0.8 },
      },
      firstSymbol,
    );
    map.addLayer({
      id: 'mun-highlight',
      type: 'line',
      source: 'mun',
      filter: ['==', ['get', 'mb'], highlight ?? '__none__'],
      paint: { 'line-color': '#0F2E2A', 'line-width': 3 },
    });
    map.fitBounds(bbox ?? CROATIA_BOUNDS, { padding: 24, duration: 0, maxZoom: 11 });

    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 8 });
    let hovered: string | number | undefined;
    map.on('mousemove', 'mun-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      if (hovered !== undefined)
        map.setFeatureState({ source: 'mun', id: hovered }, { hover: false });
      hovered = f.id;
      if (hovered !== undefined)
        map.setFeatureState({ source: 'mun', id: hovered }, { hover: true });
      map.getCanvas().style.cursor = 'pointer';
      const p = f.properties as Record<string, unknown>;
      const rate = typeof p.sep_2022 === 'number' ? p.sep_2022 : null;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>${String(p.name)}</strong><br/><span style="color:#5b6662">${String(p.county)}</span><br/>` +
            `Odvaja <strong>${pct(rate)}</strong> otpada (2022.)`,
        )
        .addTo(map);
    });
    map.on('mouseleave', 'mun-fill', () => {
      if (hovered !== undefined)
        map.setFeatureState({ source: 'mun', id: hovered }, { hover: false });
      hovered = undefined;
      map.getCanvas().style.cursor = '';
      popup.remove();
    });
    map.on('click', 'mun-fill', (e) => {
      const mb = e.features?.[0]?.properties?.mb as string | undefined;
      if (mb) navRef.current(`/opcina/${mb}`);
    });
  }

  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource('mun') as GeoJSONSource | undefined;
    src?.setData(data);
  }, [data]);

  return (
    <div className={`ck-map ${height}`}>
      <MapView
        styleUrl={POSITRON}
        className="h-full"
        center={[16.4, 44.6]}
        zoom={5.9}
        onLoad={onLoad}
        ariaLabel={ariaLabel ?? 'Karta stope odvajanja otpada po općinama i gradovima'}
      />
      <div className="ck-legend" aria-hidden="true">
        <p className="mb-1 font-semibold">Odvojeno prikupljen otpad, 2022.</p>
        <div className="flex items-center gap-1">
          {RATE_STEPS.map(([from, color]) => (
            <span key={from} className="flex flex-col items-center gap-0.5">
              <span className="block h-2.5 w-7 rounded-sm" style={{ background: color }} />
              <span className="tabular-nums text-[0.6875rem]">{from}</span>
            </span>
          ))}
          <span className="ml-1 self-end pb-0.5 text-[0.6875rem]">%</span>
        </div>
      </div>
    </div>
  );
}
