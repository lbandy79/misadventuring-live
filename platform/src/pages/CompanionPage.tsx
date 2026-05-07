/**
 * CompanionPage — Phase 7.
 *
 * The audience-member's between-show "my account" surface.
 *
 * Auth model: there is no real auth. Audience members enter the 6-char
 * access code from any of their reservations and we look up every
 * reservation under that email. The active code is persisted in
 * localStorage so they don't have to re-enter on return visits.
 *
 * What it shows:
 *   - All reservations under that email, grouped by show.
 *   - For each: live/upcoming/archived status, character link if an
 *     NPC was created (deep-link into legacy /play/:npcId), or a
 *     "build your character" CTA otherwise.
 *   - Sign-out clears the persisted code.
 *
 * What it deliberately does NOT do (yet):
 *   - Session recaps / lore notebook (separate berry-bay-companion app
 *     covers that today; merging it is a future phase).
 *   - Email/password auth (Phase 8).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACCESS_CODE_LENGTH,
  findNpcsByReservationIds,
  findReservationByCode,
  findReservationsByEmail,
  getShow,
  normalizeAccessCode,
  type NPC,
  type Reservation,
} from '@mtp/lib';

const STORAGE_KEY = 'mtp.companion.code';

interface AuthedSession {
  email: string;
  primaryCode: string;
}

export default function CompanionPage() {
  const [session, setSession] = useState<AuthedSession | null>(null);
  const [bootChecked, setBootChecked] = useState(false);

  // Boot: try to rehydrate from localStorage.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        findReservationByCode(stored).then((res) => {
          if (res) setSession({ email: res.email, primaryCode: stored });
          setBootChecked(true);
        }).catch(() => setBootChecked(true));
        return;
      }
    } catch {
      /* localStorage blocked — fall through to manual entry */
    }
    setBootChecked(true);
  }, []);

  const handleAuthed = useCallback((email: string, code: string) => {
    setSession({ email, primaryCode: code });
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch { /* private mode — ok */ }
  }, []);

  const handleSignOut = useCallback(() => {
    setSession(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
  }, []);

  if (!bootChecked) {
    return (
      <section className="page-card">
        <p className="reserve-subtitle">Looking for your reservation…</p>
      </section>
    );
  }

  if (!session) {
    return <CompanionLogin onAuthed={handleAuthed} />;
  }

  return (
    <CompanionDashboard
      email={session.email}
      onSignOut={handleSignOut}
    />
  );
}

// ── Login ──────────────────────────────────────────────────────────

interface LoginProps {
  onAuthed: (email: string, code: string) => void;
}

function CompanionLogin({ onAuthed }: LoginProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const trimmed = useMemo(() => normalizeAccessCode(code), [code]);
  const ready = trimmed.length === ACCESS_CODE_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || isChecking) return;
    setIsChecking(true);
    setError('');
    try {
      const reservation = await findReservationByCode(trimmed);
      if (!reservation) {
        setError("That code isn't on file. Double-check and try again.");
        setIsChecking(false);
        return;
      }
      onAuthed(reservation.email, reservation.accessCode);
    } catch (err) {
      console.error('Companion login failed:', err);
      setError('Something went wrong. Try again in a moment.');
      setIsChecking(false);
    }
  };

  return (
    <section className="page-card audience-card">
      <h1>Companion</h1>
      <p className="reserve-subtitle">
        Pull up your characters, see your upcoming shows, and pick up where
        you left off. Enter any access code we've sent you — we'll find the
        rest.
      </p>

      <form onSubmit={handleSubmit} className="audience-code-form">
        <label className="reserve-field">
          <span>Access code</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7P2QX"
            maxLength={ACCESS_CODE_LENGTH}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            disabled={isChecking}
            className="audience-code-input"
            aria-invalid={!!error}
          />
        </label>

        {error && <p className="reserve-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={!ready || isChecking}
        >
          {isChecking ? 'Checking…' : 'Open my companion'}
        </button>
      </form>

      <div className="audience-fallback">
        <p>No code yet?</p>
        <Link to="/reserve" className="btn-secondary">Reserve a seat</Link>
      </div>
    </section>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────

interface DashboardProps {
  email: string;
  onSignOut: () => void;
}

function CompanionDashboard({ email, onSignOut }: DashboardProps) {
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [npcsByResId, setNpcsByResId] = useState<Map<string, NPC>>(new Map());
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reses = await findReservationsByEmail(email);
        if (cancelled) return;
        setReservations(reses);
        if (reses.length > 0) {
          const ids = reses.filter((r) => r.npcCreated).map((r) => r.id);
          if (ids.length > 0) {
            const npcs = await findNpcsByReservationIds(ids);
            if (!cancelled) setNpcsByResId(npcs);
          }
        }
      } catch (err) {
        console.error('Companion dashboard load failed:', err);
        if (!cancelled) setError('Could not load your reservations. Try refreshing.');
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  return (
    <section>
      <header className="page-card companion-header">
        <div>
          <p className="reserve-subtitle" style={{ marginBottom: '0.25rem' }}>
            Signed in as
          </p>
          <h1 style={{ marginTop: 0 }}>{email}</h1>
        </div>
        <button type="button" className="btn-secondary" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      {error && (
        <section className="page-card">
          <p className="reserve-error">{error}</p>
        </section>
      )}

      {!error && reservations === null && (
        <section className="page-card">
          <p className="reserve-subtitle">Loading your reservations…</p>
        </section>
      )}

      {reservations && reservations.length === 0 && (
        <section className="page-card">
          <h2>No reservations yet</h2>
          <p>You haven't reserved any shows under this email.</p>
          <Link to="/reserve" className="btn-primary" style={{ marginTop: '1rem' }}>
            Reserve a seat
          </Link>
        </section>
      )}

      {reservations && reservations.length > 0 && (
        <>
          <h2 className="section-title">Your shows</h2>
          <div className="show-grid">
            {reservations
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((res) => (
                <ReservationCard
                  key={res.id}
                  reservation={res}
                  npc={npcsByResId.get(res.id) ?? null}
                />
              ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Single reservation card ────────────────────────────────────────

interface ReservationCardProps {
  reservation: Reservation;
  npc: NPC | null;
}

function ReservationCard({ reservation, npc }: ReservationCardProps) {
  const show = getShow(reservation.showId);
  const showName = show?.name ?? reservation.showId;
  const showStatus = show?.status;

  return (
    <article className="show-card companion-res-card">
      <div className="show-card-head">
        <span className="name">{showName}</span>
        {showStatus === 'live' && <span className="live-badge">● Live</span>}
        {showStatus && showStatus !== 'live' && (
          <span className={`upcoming-badge ${showStatus}`}>{showStatus}</span>
        )}
      </div>

      <div className="meta">
        Code: <strong style={{ letterSpacing: '0.1em' }}>{reservation.accessCode}</strong>
      </div>

      <div className="companion-res-body">
        {npc ? (
          <>
            <p className="companion-character-name">
              <span className="reserve-subtitle" style={{ display: 'block', marginBottom: 0 }}>
                Your character
              </span>
              <strong>{npc.name}</strong>
              {npc.occupation && <span className="meta"> · {npc.occupation}</span>}
            </p>
            <a href={`/play/${npc.id}`} className="show-card-cta">
              Open character →
            </a>
          </>
        ) : (
          <>
            <p className="companion-no-character">
              No character yet for this show.
            </p>
            <a
              href={`/create?code=${encodeURIComponent(reservation.accessCode)}`}
              className="show-card-cta"
            >
              Build your character →
            </a>
          </>
        )}
      </div>
    </article>
  );
}
