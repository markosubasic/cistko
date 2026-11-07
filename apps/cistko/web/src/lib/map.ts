import type { Map as MapLibreMap } from 'maplibre-gl';

/** Croatia (with a little margin) as [west, south, east, north]. */
export const CROATIA_BOUNDS: [number, number, number, number] = [13.3, 42.35, 19.5, 46.6];

/**
 * Show Croatian place names where the vector tiles have them (OpenMapTiles `name:hr`), else the local
 * name. Only symbol layers that already draw a name are changed.
 */
export function localizeLabels(map: MapLibreMap): void {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const field = map.getLayoutProperty(layer.id, 'text-field') as unknown;
    if (field == null || !JSON.stringify(field).includes('name')) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', 'name:hr'],
        ['get', 'name:latin'],
        ['get', 'name'],
      ]);
    } catch {
      /* a layer with an incompatible expression keeps its own label */
    }
  }
}
