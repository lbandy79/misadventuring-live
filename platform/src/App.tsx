/**
 * Platform shell — routes only. No reservation system.
 *
 * Canonical recap URL: /shows/:showId/recap
 * Backward-compat alias: /recap/:showId (kept so any QR codes / old links
 * still work — both render the same RecapPage component).
 *
 * /my-bears redirects to /my-characters (cutover alias — keep until old links die).
 * /companion redirects to /notebook (replaced May 2026).
 */

import { useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { upsertAudienceProfile } from '../../src/lib/audience/audienceApi';
import LandingPage from './pages/LandingPage';
import ShowsIndexPage from './pages/ShowsIndexPage';
import ShowPage from './pages/ShowPage';
import AudiencePage from './pages/AudiencePage';
import NotebookPage from './pages/NotebookPage';
import NotebookShowPage from './pages/NotebookShowPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import RecapPage from './pages/RecapPage';
import MadLibsDisplayPage from './pages/MadLibsDisplayPage';
import NpcCreationPage from './pages/NpcCreationPage';
import ReturnPage from './pages/ReturnPage';
import MyCharactersPage from './pages/MyCharactersPage';
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
          <Link to="/notebook">Notebook</Link>
          <AuthMenu />
        </nav>
      </header>
      <main className="platform-main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/shows" element={<ShowsIndexPage />} />
          <Route path="/shows/:showId" element={<ShowPage />} />
          <Route path="/shows/:showId/audience" element={<AudiencePage />} />
          {/* Canonical recap URL */}
          <Route path="/shows/:showId/recap" element={<RecapPage />} />
          {/* Backward-compat alias — keep for old QR codes and external links */}
          <Route path="/recap/:showId" element={<RecapPage />} />
          {/* Audience NPC creation / join flow */}
          <Route path="/shows/:showId/join" element={<NpcCreationPage />} />
          {/* Projector / "big screen" view */}
          <Route path="/shows/:showId/display" element={<MadLibsDisplayPage />} />
          {/* Misadventuring Notebook — per-show/NPC URL reserved for future build */}
          <Route path="/shows/:showId/notebook/:npcId" element={<NotebookShowPage />} />
          {/* Notebook concept page — top-level */}
          <Route path="/notebook" element={<NotebookPage />} />
          {/* Audience return flow */}
          <Route path="/return" element={<ReturnPage />} />
          <Route path="/my-characters" element={<MyCharactersPage />} />
          {/* Cutover alias — /my-bears lived in old links, redirect silently */}
          <Route path="/my-bears" element={<Navigate to="/my-characters" replace />} />
          {/* Companion redirects to notebook — old nav link alias */}
          <Route path="/companion" element={<Navigate to="/notebook" replace />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="platform-footer">
        <div className="footer-brand">
          <img
            src="/images/mtp-logo.png"
            alt=""
            className="footer-mark"
            width={28}
            height={28}
            decoding="async"
          />
          <span>© {new Date().getFullYear()} The Misadventuring Party</span>
        </div>
        <NotifyForm />
      </footer>
    </div>
  );
}

// ─── Footer notify-me capture ─────────────────────────────────────────────────

function NotifyForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || status === 'saving') return;
    setStatus('saving');
    try {
      await upsertAudienceProfile({ email: trimmed, optedInForUpdates: true });
      setStatus('done');
      setEmail('');
    } catch (err) {
      console.error('notify-me write failed:', err);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return <p className="footer-notify-thanks">Got it. We'll holler before the next show.</p>;
  }

  return (
    <form className="footer-notify" onSubmit={handleSubmit} noValidate>
      <label htmlFor="footer-email" className="footer-notify-label">
        Get show updates
      </label>
      <div className="footer-notify-row">
        <input
          id="footer-email"
          type="email"
          className="footer-notify-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={120}
          disabled={status === 'saving'}
          autoComplete="email"
        />
        <button
          type="submit"
          className="footer-notify-btn"
          disabled={!email.trim() || status === 'saving'}
        >
          {status === 'saving' ? '…' : 'Notify me'}
        </button>
      </div>
      {status === 'error' && (
        <p className="footer-notify-error">Something went sideways. Try again.</p>
      )}
    </form>
  );
}
