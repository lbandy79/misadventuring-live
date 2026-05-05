/**
 * AudiencePage — Phase 6 platform entry point for audience members
 * physically at a live show.
 *
 * Flow:
 *   1. Read showId from URL.
 *   2. Show "Live now" / "Not live yet" status (sourced from platform
 *      currentShowId via ShowProvider).
 *   3. Let the audience member enter their 6-char access code.
 *   4. On success, deep-link into the companion / character builder
 *      with `?code=XXXXXX`.
 *
 * This intentionally does NOT host the live audience interactions
 * (votes, monster builder, etc.) — those still live in the legacy
 * `AudienceView`. Migrating that surface is its own future phase.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShowProvider,
  getShow,
  useShow,
  findReservationByCode,
  ACCESS_CODE_LENGTH,
  normalizeAccessCode,
  type Reservation,
} from '@mtp/lib';

export default function AudiencePage() {
  const { showId } = useParams<{ showId: string }>();
  const show = showId ? getShow(showId) : undefined;

  if (!showId || !show) {
    return (
      <section className="page-card">
        <h1>Show not found</h1>
        <p>No show is registered with id "{showId}".</p>
        <p>
          <Link to="/shows">← Back to all shows</Link>
        </p>
      </section>
    );
  }

  return (
    <ShowProvider forceShowId={showId}>
      <AudiencePageInner showId={showId} showName={show.name} />
    </ShowProvider>
  );
}

interface AudienceInnerProps {
  showId: string;
  showName: string;
}

function AudiencePageInner({ showId, showName }: AudienceInnerProps) {
  // useShow gives us the raw platform.currentShowId via context.
  // (forceShowId is what *this* tree resolves to, but the underlying
  //  platform doc is still subscribed and exposed here.)
  const navigate = useNavigate();
  const ctx = useShow();
  // Live = platform's currentShowId points at THIS show.
  // We re-resolve by re-reading the underlying data, but since we forced the
  // id, we approximate: "live" if show.status === 'live'. (A future phase can
  // wire a separate `usePlatformConfig()` hook to be truly live-aware.)
  const isLiveStatus = ctx.show?.status === 'live';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const trimmed = useMemo(() => normalizeAccessCode(code), [code]);
  const isValidLength = trimmed.length === ACCESS_CODE_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLength || isChecking) return;
    setIsChecking(true);
    setError('');
    try {
      const reservation: Reservation | null = await findReservationByCode(trimmed, showId);
      if (!reservation) {
        setError("That code doesn't match this show. Double-check it and try again.");
        setIsChecking(false);
        return;
      }
      // Deep-link into the legacy companion / character builder.
      window.location.href = `/create?code=${encodeURIComponent(reservation.accessCode)}`;
    } catch (err) {
      console.error('Code lookup failed:', err);
      setError('Something went wrong. Try again in a moment.');
      setIsChecking(false);
    }
  };

  return (
    <section className="page-card audience-card">
      <div className="audience-status-row">
        {isLiveStatus ? (
          <span className="live-badge">● Live</span>
        ) : (
          <span className="upcoming-badge">Upcoming</span>
        )}
        <span className="audience-show-name">{showName}</span>
      </div>

      <h1>Welcome to the show</h1>
      <p className="reserve-subtitle">
        Enter the 6-character access code from your reservation email to build
        your character and join the audience interactions.
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
          disabled={!isValidLength || isChecking}
        >
          {isChecking ? 'Checking…' : 'Enter the show'}
        </button>
      </form>

      <div className="audience-fallback">
        <p>Don't have a code yet?</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate(`/reserve?show=${encodeURIComponent(showId)}`)}
        >
          Reserve a seat now
        </button>
      </div>

      <p className="reserve-fineprint">
        Audience interactions (votes, monster builder, character naming) still
        run on the legacy stage app for now — your code unlocks both.
      </p>
    </section>
  );
}
