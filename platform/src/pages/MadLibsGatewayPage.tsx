/**
 * MadLibsGatewayPage — Phase 11 / Phase 2.5.
 *
 * Identity gateway for `/vote/:showId`. Mirrors the legacy AccessCodeEntry
 * pattern (six character boxes, auto-advance, paste support) plus a second
 * path for anonymous voting.
 *
 * Two paths, both end in localStorage being seeded and a redirect to the
 * vote page:
 *   1. "I have a reservation code" → 6-char input → findReservationByCode
 *      → saveReservationIdentity → /vote/:showId
 *   2. "Vote anonymously" → saveAnonIdentity → /vote/:showId
 *
 * If the user already has a stored identity, this page still renders so
 * they can switch (the vote page links here as "Switch identity").
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ACCESS_CODE_LENGTH,
  findReservationByCode,
  getShow,
  loadVoterIdentity,
  normalizeAccessCode,
  saveAnonIdentity,
  saveReservationIdentity,
} from '@mtp/lib';

export default function MadLibsGatewayPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const show = showId ? getShow(showId) : undefined;

  const [chars, setChars] = useState<string[]>(
    Array(ACCESS_CODE_LENGTH).fill(''),
  );
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = chars.join('');
  const existing = useMemo(() => loadVoterIdentity(), []);

  // ── 6-box behavior (mirrors legacy AccessCodeEntry) ────────────────
  const focusBox = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(ACCESS_CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
  }, []);

  const handleBoxChange = useCallback(
    (index: number, value: string) => {
      const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!cleaned) return;
      setError('');
      setChars((prev) => {
        const next = [...prev];
        next[index] = cleaned[0];
        return next;
      });
      if (index < ACCESS_CODE_LENGTH - 1) focusBox(index + 1);
    },
    [focusBox],
  );

  const handleBoxKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        setChars((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = '';
          } else if (index > 0) {
            next[index - 1] = '';
            focusBox(index - 1);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft' && index > 0) {
        focusBox(index - 1);
      } else if (e.key === 'ArrowRight' && index < ACCESS_CODE_LENGTH - 1) {
        focusBox(index + 1);
      }
    },
    [focusBox],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = normalizeAccessCode(e.clipboardData.getData('text')).slice(
        0,
        ACCESS_CODE_LENGTH,
      );
      if (!pasted) return;
      setError('');
      setChars((prev) => {
        const next = [...prev];
        for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
        return next;
      });
      focusBox(Math.min(pasted.length, ACCESS_CODE_LENGTH - 1));
    },
    [focusBox],
  );

  // ── Submit reservation code ────────────────────────────────────────
  const submitCode = useCallback(
    async (rawCode: string) => {
      if (!showId) return;
      const trimmed = normalizeAccessCode(rawCode);
      if (trimmed.length !== ACCESS_CODE_LENGTH) {
        setError('Access codes are 6 characters.');
        return;
      }
      setIsChecking(true);
      setError('');
      try {
        const reservation = await findReservationByCode(trimmed, showId);
        if (!reservation) {
          setError("Code not found for this show. Double-check it.");
          return;
        }
        saveReservationIdentity({
          id: reservation.id,
          showId: reservation.showId,
          name: reservation.name,
          accessCode: reservation.accessCode,
        });
        navigate(`/vote/${showId}`, { replace: true });
      } catch (err) {
        console.error('Reservation lookup failed:', err);
        setError('Something went wrong. Try again in a moment.');
      } finally {
        setIsChecking(false);
      }
    },
    [showId, navigate],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCode(code);
  };

  const handleAnonymous = () => {
    if (!showId) return;
    saveAnonIdentity();
    navigate(`/vote/${showId}`, { replace: true });
  };

  // ── Auto-fill + auto-submit when ?code= arrives in URL ─────────────
  useEffect(() => {
    const urlCode = normalizeAccessCode(searchParams.get('code') ?? '');
    if (urlCode.length === ACCESS_CODE_LENGTH && !autoSubmitted) {
      setChars(urlCode.split(''));
      setAutoSubmitted(true);
      void submitCode(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <section className="page-card vote-gateway-card">
      <header className="vote-gateway-head">
        <p className="vote-gateway-eyebrow">Help shape the heist</p>
        <h1 className="vote-gateway-title">{show.name}</h1>
        <p className="vote-gateway-subtitle">
          Two ways in. Pick one.
        </p>
      </header>

      {existing && (
        <p className="vote-gateway-existing">
          You already have an identity saved on this device
          {existing.kind === 'reservation' && existing.reservation
            ? ` (${existing.reservation.name})`
            : ' (anonymous)'}
          . Picking again will replace it.
          {' '}
          <Link to={`/vote/${showId}`}>Skip and vote →</Link>
        </p>
      )}

      <div className="vote-gateway-paths">
        {/* Path 1: Reservation code */}
        <form
          onSubmit={handleSubmit}
          className="vote-gateway-path vote-gateway-path-code"
          aria-labelledby="vote-path-code-title"
        >
          <h2 id="vote-path-code-title">I have a reservation code</h2>
          <p className="vote-gateway-path-blurb">
            Vote tied to your seat. Switching devices later? Re-enter the code.
          </p>

          <div className="vote-gateway-code-boxes" role="group" aria-label="Access code">
            {chars.map((char, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="text"
                className={`vote-gateway-code-box ${char ? 'is-filled' : ''}`}
                value={char}
                onChange={(e) => handleBoxChange(i, e.target.value)}
                onKeyDown={(e) => handleBoxKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                maxLength={2}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={isChecking}
                aria-label={`Character ${i + 1}`}
              />
            ))}
          </div>

          {error && <p className="vote-gateway-error">{error}</p>}

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={code.length !== ACCESS_CODE_LENGTH || isChecking}
          >
            {isChecking ? 'Checking…' : 'Unlock my vote'}
          </button>
        </form>

        <div className="vote-gateway-divider" aria-hidden="true">
          <span>or</span>
        </div>

        {/* Path 2: Anonymous */}
        <div
          className="vote-gateway-path vote-gateway-path-anon"
          aria-labelledby="vote-path-anon-title"
        >
          <h2 id="vote-path-anon-title">Vote anonymously</h2>
          <p className="vote-gateway-path-blurb">
            No code needed. One vote per device. Tied to this browser only.
          </p>
          <button
            type="button"
            className="btn-secondary btn-block"
            onClick={handleAnonymous}
            disabled={isChecking}
          >
            Vote without a reservation
          </button>
        </div>
      </div>

      <p className="vote-gateway-fineprint">
        Don't have a code yet?{' '}
        <Link to={`/reserve?show=${encodeURIComponent(showId)}`}>
          Reserve a seat
        </Link>
        .
      </p>
    </section>
  );
}
