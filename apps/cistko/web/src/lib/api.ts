import type {
  Dump,
  DumpCollection,
  FacilityCollection,
  GeocodeResponse,
  League,
  MunicipalityCard,
  MunicipalityCollection,
  MunicipalityHit,
  Nearby,
  Overview,
} from './types';

/** Error with the server's RFC 7807 `detail` (Croatian text) when present. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Nije moguće doći do poslužitelja. Provjerite internetsku vezu.', 0);
  }
  if (!response.ok) {
    let detail = '';
    try {
      const problem = (await response.json()) as { detail?: unknown; title?: string };
      detail = typeof problem.detail === 'string' ? problem.detail : (problem.title ?? '');
    } catch {
      /* not JSON */
    }
    throw new ApiError(
      detail || `Poslužitelj je vratio status ${response.status}.`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

const qs = (params: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();

export const api = {
  geocode: (q: string, signal?: AbortSignal) =>
    request<GeocodeResponse>(`/geocode?${qs({ q })}`, { signal }),
  overview: (signal?: AbortSignal) => request<Overview>('/overview', { signal }),
  searchMunicipalities: (q: string, signal?: AbortSignal) =>
    request<{ results: MunicipalityHit[] }>(`/municipalities?${qs({ q })}`, { signal }),
  municipality: (mb: string, signal?: AbortSignal) =>
    request<MunicipalityCard>(`/municipalities/${encodeURIComponent(mb)}`, { signal }),
  outlines: (signal?: AbortSignal) =>
    request<MunicipalityCollection>('/municipalities.geojson', { signal }),
  league: (signal?: AbortSignal) => request<League>('/league', { signal }),
  dumps: (mb?: string, signal?: AbortSignal) =>
    request<DumpCollection>(`/dumps${mb ? `?${qs({ mb })}` : ''}`, { signal }),
  dump: (id: number, signal?: AbortSignal) => request<Dump>(`/dumps/${id}`, { signal }),
  photos: (limit: number, signal?: AbortSignal) =>
    request<{ items: Dump[] }>(`/photos?${qs({ limit })}`, { signal }),
  nearby: (lat: number, lon: number, radius: number, signal?: AbortSignal) =>
    request<Nearby>(`/nearby?${qs({ lat, lon, radius_m: radius })}`, { signal }),
  facilities: (signal?: AbortSignal) => request<FacilityCollection>('/facilities', { signal }),
};
