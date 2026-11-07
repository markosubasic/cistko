/** Response types of the Čistko API (/api/v1). */

export type DumpStatus = 'on_site' | 'reported' | 'removed';

export interface GeocodeItem {
  label: string;
  title: string;
  lat: number;
  lon: number;
  type?: string | null;
}

export interface GeocodeResponse {
  results: GeocodeItem[];
  attribution: string;
  cached: boolean;
}

export interface StatusCounts {
  on_site: number;
  reported: number;
  removed: number;
  total: number;
}

export interface CategoryCount {
  category: string;
  label: string;
  count: number;
}

export interface Overview {
  dumps: StatusCounts & {
    with_photo: number;
    categories: CategoryCount[];
    removed_share: number | null;
    top_municipality: { name: string; count: number };
  };
  separation: {
    median_2022: number | null;
    median_2019: number | null;
    max_2022: number | null;
    at_least_50: number;
    under_10: number;
    improved: number;
    municipalities: number;
    best: { mb: string; name: string; county: string; sep_2022: number | null };
  };
  counties: {
    rb: string;
    name: string;
    recycling_2022: number | null;
    median_separation_2022: number | null;
    municipalities: number;
  }[];
  facilities: Record<string, { count: number; label: string; year: number }>;
  eu_recycling_targets: Record<string, number>;
}

export interface MunicipalityHit {
  mb: string;
  name: string;
  kind: string;
  county: string;
  sep_2022: number | null;
}

export interface Dump {
  id: number;
  name: string | null;
  description: string | null;
  settlement: string | null;
  municipality: string;
  mb: string | null;
  waste_type: string | null;
  category: string;
  category_label: string;
  qty_kg: number | null;
  volume_m3: number | null;
  area_m2: number | null;
  status: DumpStatus;
  status_label: string;
  photos: string[];
  lon: number;
  lat: number;
  distance_m?: number;
}

export interface Facility {
  id: number;
  kind: string;
  kind_label: string;
  year: number;
  name: string | null;
  operator: string | null;
  address: string | null;
  status: string | null;
  url: string | null;
  info: Record<string, string | number>;
  lon: number;
  lat: number;
  distance_m?: number;
}

export interface Nearby {
  location: { lat: number; lon: number };
  radius_m: number;
  municipality: MunicipalityHit | null;
  counts: StatusCounts;
  sites: Dump[];
  /** Every site within the radius (compact), for the map. */
  points: DumpCollection;
  recycling_yards: Facility[];
  nearest: Record<string, Facility | null>;
  computed_at: string;
}

export interface MunicipalityCard {
  mb: string;
  name: string;
  kind: string;
  county: string;
  area_km2: number | null;
  center: [number, number];
  bbox: [number, number, number, number];
  separation: {
    rate_2022: number | null;
    rate_2019: number | null;
    change_pp: number | null;
    rank_hr: number;
    of_hr: number;
    rank_county: number;
    of_county: number;
    national_median_2022: number | null;
    county_median_2022: number | null;
    waste_2019_t: number | null;
    mixed_2019_t: number | null;
    separated_2019_t: number | null;
  };
  county_recycling_2022: number | null;
  eu_recycling_targets: Record<string, number>;
  dumps: StatusCounts & {
    removed_share: number | null;
    qty_kg: number | null;
    volume_m3: number | null;
    area_m2: number | null;
    categories: CategoryCount[];
    with_photos: Dump[];
  };
  facilities: Facility[];
  recycling_yards_nearest: Facility[];
  neighbours: { mb: string; name: string; sep_2022: number | null }[];
}

export interface LeagueRow {
  mb: string;
  name: string;
  kind: string;
  county: string;
  sep_2022: number | null;
  sep_2019: number | null;
  change_pp: number | null;
  rank_hr: number;
  rank_county: number;
  dumps: number;
  removed: number;
}

export interface League {
  county: string | null;
  items: LeagueRow[];
  count: number;
}

export interface MunicipalityProps {
  mb: string;
  name: string;
  kind: string;
  county: string;
  sep_2022: number | null;
  sep_2019: number | null;
  dumps: number;
  removed: number;
}

export type MunicipalityCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, MunicipalityProps>;

export type DumpCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  { id: number; status: DumpStatus; photo: boolean; mb: string | null }
>;

export type FacilityCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Omit<Facility, 'lon' | 'lat'>
>;
