import { MapView } from '@dt/ui';
import { Marker, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { STATUS_COLOR } from '../lib/format';
import { localizeLabels } from '../lib/map';
import type { DumpCollection, FacilityCollection } from '../lib/types';
import { POSITRON } from './RateMap';

export const FACILITY_COLOR: Record<string, string> = {
  recycling_yard: '#1f5fbf',
  landfill: '#6B4F3A',
  sorting: '#7C3AED',
  cgo: '#0F766E',
  compost: '#65A30D',
  cave_dump: '#DB2777',
};

interface Props {
  dumps: DumpCollection;
  facilities?: FacilityCollection;
  /** Show only these facility kinds. */
  facilityKinds?: string[];
  center: [number, number];
  zoom: number;
  height?: string;
  cluster?: boolean;
  /** Marker of the searched address. */
  home?: [number, number];
  /** Circle radius around `home` in metres. */
  radiusM?: number;
  outline?: GeoJSON.Geometry;
  /** Fit the map to [west, south, east, north] on load. */
  fitBbox?: [number, number, number, number];
  onSelectDump?: (id: number) => void;
  onSelectFacility?: (props: Record<string, unknown>) => void;
  ariaLabel: string;
}

function circle(center: [number, number], radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lon, lat] = center;
  const coords: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    const dx = (radiusM * Math.cos(a)) / (111_320 * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusM * Math.sin(a)) / 110_540;
    coords.push([lon + dx, lat + dy]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

const statusColor = [
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

const facilityColor: unknown[] = ['match', ['get', 'kind']];
for (const [k, c] of Object.entries(FACILITY_COLOR)) facilityColor.push(k, c);
facilityColor.push('#555');

/** Dump sites (clustered for the national map) with optional facilities, outline and address circle. */
export function DumpMap({
  dumps,
  facilities,
  facilityKinds,
  center,
  zoom,
  height = 'h-[460px]',
  cluster = false,
  home,
  radiusM,
  outline,
  fitBbox,
  onSelectDump,
  onSelectFacility,
  ariaLabel,
}: Props) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const cb = useRef({ onSelectDump, onSelectFacility });
  cb.current = { onSelectDump, onSelectFacility };

  function onLoad(map: MapLibreMap) {
    mapRef.current = map;
    localizeLabels(map);
    if (fitBbox) map.fitBounds(fitBbox, { padding: 32, duration: 0, maxZoom: 14 });
    if (outline) {
      map.addSource('outline', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: outline },
      });
      map.addLayer({
        id: 'outline-fill',
        type: 'fill',
        source: 'outline',
        paint: { 'fill-color': '#111111', 'fill-opacity': 0.04 },
      });
      map.addLayer({
        id: 'outline-line',
        type: 'line',
        source: 'outline',
        paint: { 'line-color': '#111111', 'line-width': 2, 'line-dasharray': [2, 1] },
      });
    }
    if (home && radiusM) {
      map.addSource('radius', { type: 'geojson', data: circle(home, radiusM) });
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius',
        paint: { 'fill-color': '#111111', 'fill-opacity': 0.05 },
      });
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'radius',
        paint: { 'line-color': '#111111', 'line-width': 1.5, 'line-opacity': 0.5 },
      });
    }
    if (facilities) {
      map.addSource('fac', { type: 'geojson', data: facilities });
      map.addLayer({
        id: 'fac',
        type: 'circle',
        source: 'fac',
        filter: facilityKinds
          ? ['in', ['get', 'kind'], ['literal', facilityKinds]]
          : ['has', 'kind'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 13, 8],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'circle-color': facilityColor as any,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });
      map.on('click', 'fac', (e) => {
        const p = e.features?.[0]?.properties;
        if (p) cb.current.onSelectFacility?.(p as Record<string, unknown>);
      });
      map.on('mouseenter', 'fac', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'fac', () => (map.getCanvas().style.cursor = ''));
    }
    map.addSource('dumps', {
      type: 'geojson',
      data: dumps,
      cluster,
      clusterRadius: 44,
      clusterMaxZoom: 13,
      clusterProperties: cluster
        ? {
            removed: ['+', ['case', ['==', ['get', 'status'], 'removed'], 1, 0]],
          }
        : undefined,
    });
    if (cluster) {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'dumps',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#111111',
          'circle-opacity': 0.88,
          'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 100, 24, 1000, 32],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'dumps',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.on('click', 'clusters', async (e) => {
        const f = e.features?.[0];
        const src = map.getSource('dumps') as GeoJSONSource;
        const id = f?.properties?.cluster_id as number | undefined;
        if (f && id !== undefined) {
          const z = await src.getClusterExpansionZoom(id);
          map.easeTo({
            center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: z,
          });
        }
      });
      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));
    }
    map.addLayer({
      id: 'dump',
      type: 'circle',
      source: 'dumps',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 7, 17, 10],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'circle-color': statusColor as any,
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1.5,
      },
    });
    map.on('click', 'dump', (e) => {
      const id = e.features?.[0]?.properties?.id as number | undefined;
      if (id !== undefined) cb.current.onSelectDump?.(id);
    });
    map.on('mouseenter', 'dump', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'dump', () => (map.getCanvas().style.cursor = ''));
    if (home) {
      const el = document.createElement('div');
      el.className = 'ck-home-marker';
      el.style.cssText =
        'width:22px;height:22px;border-radius:999px;background:#111111;border:3px solid #fff;outline:2px solid #111';
      new Marker({ element: el }).setLngLat(home).addTo(map);
    }
  }

  useEffect(() => {
    const src = mapRef.current?.getSource('dumps') as GeoJSONSource | undefined;
    src?.setData(dumps);
  }, [dumps]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('fac')) return;
    map.setFilter(
      'fac',
      facilityKinds ? ['in', ['get', 'kind'], ['literal', facilityKinds]] : ['has', 'kind'],
    );
  }, [facilityKinds]);

  return (
    <div className={`ck-map ${height}`}>
      <MapView
        styleUrl={POSITRON}
        className="h-full"
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
