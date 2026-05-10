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
import AudiencePage from './pages/AudiencePage';
import CompanionPage from './pages/CompanionPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import RecapPage from './pages/RecapPage';
import MadLibsVotePage from './pages/MadLibsVotePage';
import MadLibsGatewayPage from './pages/MadLibsGatewayPage';
import AuthMenu from './components/AuthMenu';

export default function App() {
  return (
    <div className="platform-root">
      <header className="platform-header">
        <Link to="/" className="brand" aria-label="The Misadventuring Party home">
          <img
            src="/images/mtp-logo.png"
            alt=""
            className="brand-mark"
            width={40}
            height={40}
            decoding="async"
          />
          <span className="brand-wordmark">The Misadventuring Party</span>
        </Link>
        <nav>
          <Link to="/shows">Shows</Link>
          <Link to="/reserve">Reserve</Link>
          <Link to="/companion">Companion</Link>
          <AuthMenu />
        </nav>
      </header>
      <main className="platform-main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/reserve" element={<ReservePage />} />
          <Route path="/shows" element={<ShowsIndexPage />} />
          <Route path="/shows/:showId" element={<ShowPage />} />
          <Route path="/shows/:showId/audience" element={<AudiencePage />} />
          <Route path="/companion" element={<CompanionPage />} />
          <Route path="/recap/:showId" element={<RecapPage />} />
          <Route path="/shows/:showId/vote" element={<MadLibsGatewayPage />} />
          <Route path="/vote/:showId" element={<MadLibsVotePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="platform-footer">
        <img
          src="/images/mtp-logo.png"
          alt=""
          className="footer-mark"
          width={28}
          height={28}
          decoding="async"
        />
        <span>© {new Date().getFullYear()} The Misadventuring Party</span>
      </footer>
    </div>
  );
}
