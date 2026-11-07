import { SkipLink } from '@dt/ui';
import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Logo } from './components/icons';
import { HomePage } from './pages/HomePage';
import { LeaguePage } from './pages/LeaguePage';
import { MapPage } from './pages/MapPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { MunicipalityPage } from './pages/MunicipalityPage';
import { NearbyPage } from './pages/NearbyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SourcesPage } from './pages/SourcesPage';

const NAV = [
  { to: '/karta', label: 'Karta otpada' },
  { to: '/liga', label: 'Liga općina' },
  { to: '/metodologija', label: 'Kako računamo' },
  { to: '/izvori', label: 'Izvori' },
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
        <div className="ck-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link to="/" className="ck-logo" aria-label="Čistko, naslovnica">
            <Logo />
            Čistko
          </Link>
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
          <Route path="/metodologija" element={<MethodologyPage />} />
          <Route path="/izvori" element={<SourcesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="mt-16 border-t border-[#e4e2da] bg-white">
        <div className="ck-wrap grid gap-3 py-8 text-sm text-[#5b6662] md:grid-cols-[1fr_auto]">
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
