import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import league from './__fixtures__/2026-11-07_league_top5_bottom5.json';
import municipality from './__fixtures__/2026-11-07_municipality_00019.json';
import nearby from './__fixtures__/2026-11-07_nearby_pula_1500.json';
import overview from './__fixtures__/2026-11-07_overview.json';
import photos from './__fixtures__/2026-11-09_photos_8.json';
import {
  countyLabel,
  fullName,
  lokacija,
  pct,
  rateColor,
  RATE_STEPS,
  signedPp,
} from './lib/format';
import { HomePage } from './pages/HomePage';
import { MunicipalityPage } from './pages/MunicipalityPage';
import { NearbyPage } from './pages/NearbyPage';

// MapLibre needs WebGL, which jsdom does not have: the map is replaced by an empty region.
vi.mock('@dt/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dt/ui')>();
  return {
    ...actual,
    MapView: ({ ariaLabel }: { ariaLabel?: string }) => (
      <div role="region" aria-label={ariaLabel} />
    ),
  };
});

const EMPTY = { type: 'FeatureCollection', features: [] };

function routeFixture(url: string): unknown {
  const path = url.replace(/^.*\/api\/v1/, '');
  if (path.startsWith('/overview')) return overview;
  if (path.startsWith('/league')) return league;
  if (path.startsWith('/municipalities/00019')) return municipality;
  if (path.startsWith('/nearby')) return nearby;
  if (path.startsWith('/photos')) return photos;
  if (
    path.startsWith('/municipalities.geojson') ||
    path.startsWith('/dumps') ||
    path.startsWith('/facilities')
  )
    return EMPTY;
  throw new Error(`unexpected request ${url}`);
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(routeFixture(String(url))), { status: 200 }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderAt(path: string, element: React.ReactNode, pattern = '*') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('format helpers', () => {
  it('formats percentages and percentage points in Croatian', () => {
    expect(pct(16.7)).toBe('16,7 %');
    expect(pct(null)).toBe('–');
    expect(signedPp(8.7)).toBe('+8,7 p. b.');
    expect(signedPp(-1.2)).toBe('−1,2 p. b.');
  });
  it('uses the right plural and names', () => {
    expect(lokacija(1)).toBe('lokacija');
    expect(lokacija(3)).toBe('lokacije');
    expect(lokacija(12)).toBe('lokacija');
    expect(lokacija(22)).toBe('lokacije');
    expect(fullName('Općina', 'Belica')).toBe('Općina Belica');
    expect(fullName('Grad', 'Grad Zagreb')).toBe('Grad Zagreb');
    expect(countyLabel('Međimurska')).toBe('Međimurska županija');
    expect(countyLabel('Grad Zagreb')).toBe('Grad Zagreb');
  });
  it('colours rates on the ramp', () => {
    expect(rateColor(74.3)).toBe(RATE_STEPS[RATE_STEPS.length - 1]![1]);
    expect(rateColor(0)).toBe(RATE_STEPS[0]![1]);
  });
});

describe('pages on recorded API responses (2026-11-07 and 2026-11-09)', () => {
  it('home shows the national numbers and the league', async () => {
    renderAt('/', <HomePage />);
    expect((await screen.findAllByText('14.195')).length).toBeGreaterThan(0);
    expect(screen.getByText('3.001')).toBeInTheDocument();
    expect(await screen.findByText('Općina Belica')).toBeInTheDocument();
    expect(screen.getByText(/Nijedna županija ne reciklira/)).toBeInTheDocument();
    // photos of the register are served from our own origin
    const imgs = await screen.findAllByRole('img');
    const srcs = imgs.map((i) => i.getAttribute('src') ?? '').filter((s) => s.includes('photo'));
    expect(srcs.length).toBe(5);
    expect(srcs.every((s) => /^\/api\/v1\/photo\/[0-9a-f-]{36}\.jpg$/.test(s))).toBe(true);
  });

  it('municipality card shows rate, change and rank', async () => {
    renderAt('/opcina/00019', <MunicipalityPage />, '/opcina/:mb');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Općina Andrijaševci' }),
    ).toBeInTheDocument();
    expect(screen.getByText('+8,7 p. b.')).toBeInTheDocument();
    expect(screen.getAllByText('14,1 %').length).toBeGreaterThan(0);
    expect(screen.getByText(/320\. od 556 u Hrvatskoj/)).toBeInTheDocument();
    expect(screen.getAllByText(/upisanih lokacija/).length).toBeGreaterThan(0);
  });

  it('nearby lists the sites around Pula with their status', async () => {
    renderAt('/adresa?lat=44.86431&lon=13.84397&q=Pula', <NearbyPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Pula' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Uklonjeno').length).toBeGreaterThan(10));
    expect(screen.getByText('Najbliža reciklažna dvorišta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Prijavi odbačeni otpad/ })).toHaveAttribute(
      'href',
      'https://eloo.haop.hr/public/',
    );
  });
});
