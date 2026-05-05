/**
 * Phase 4 platform shell — routes only. Each page is a placeholder
 * landing surface that will be filled out by phases 5 (marketing),
 * 6 (live show shell), 7 (companion).
 */

import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ReservePage from './pages/ReservePage';
import ShowsIndexPage from './pages/ShowsIndexPage';
import ShowPage from './pages/ShowPage';
import CompanionPage from './pages/CompanionPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="platform-root">
      <header className="platform-header">
        <Link to="/" className="brand">The Misadventuring Party</Link>
        <nav>
          <Link to="/shows">Shows</Link>
          <Link to="/reserve">Reserve</Link>
          <Link to="/companion">Companion</Link>
        </nav>
      </header>
      <main className="platform-main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/reserve" element={<ReservePage />} />
          <Route path="/shows" element={<ShowsIndexPage />} />
          <Route path="/shows/:showId" element={<ShowPage />} />
          <Route path="/companion" element={<CompanionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="platform-footer">
        <span>© {new Date().getFullYear()} The Misadventuring Party</span>
      </footer>
    </div>
  );
}
