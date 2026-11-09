import { SkipLink } from '@dt/ui';
import { useEffect } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LeaguePage } from './pages/LeaguePage';
import { MapPage } from './pages/MapPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { MunicipalityPage } from './pages/MunicipalityPage';
import { NearbyPage } from './pages/NearbyPage';
import { NotFoundPage } from './pages/NotFoundPage';

const NAV = [
  { to: '/karta', label: 'Karta otpada' },
  { to: '/liga', label: 'Liga općina' },
  { to: '/o-podacima', label: 'O podacima' },
];

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <SkipLink />
      <ScrollTop />
      <header className="ck-header">
        <div className="ck-wrap flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pb-3 pt-5">
          <div>
            <Link to="/" className="ck-logo" aria-label="Čistko, naslovnica">
              Čistko
            </Link>
            <p className="ck-dateline">Odbačeni otpad i odvajanje u 556 općina i gradova</p>
          </div>
          <nav
            aria-label="Glavna navigacija"
            className="ck-nav -mx-1 flex max-w-full gap-1 overflow-x-auto"
          >
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/adresa" element={<NearbyPage />} />
          <Route path="/opcina/:mb" element={<MunicipalityPage />} />
          <Route path="/liga" element={<LeaguePage />} />
          <Route path="/karta" element={<MapPage />} />
          <Route path="/o-podacima" element={<MethodologyPage />} />
          <Route path="/metodologija" element={<Navigate to="/o-podacima" replace />} />
          <Route path="/izvori" element={<Navigate to="/o-podacima#izvori" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="ck-footer mt-20">
        <div className="ck-wrap grid gap-3 py-8 text-sm md:grid-cols-[1fr_auto]">
          <p>
            Podaci: Ministarstvo zaštite okoliša i energetike, „Gospodarenje otpadom” na{' '}
            <a
              className="underline"
              href="https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs"
            >
              Portalu otvorenih podataka
            </a>
            . Karta © OpenStreetMap contributors, OpenFreeMap.
          </p>
          <p>Datathon Portala otvorenih podataka 2026. · Kôd: EUPL-1.2</p>
        </div>
      </footer>
    </>
  );
}
