/**
 * ReservePage — Phase 5.
 *
 * Pick a show → enter name + email → mint a 6-char access code → fire
 * EmailJS confirmation (best-effort) → display the code with copy + save
 * affordances.
 *
 * Show selection comes from the platform Show registry (`useShow`).
 * Reservation persistence and code generation come from `@mtp/lib`
 * (`createReservation`, `sendReservationEmail`) which are shared with
 * the legacy `/create` flow.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useShow,
  createReservation,
  sendReservationEmail,
  type Reservation,
} from '@mtp/lib';

type Status = 'idle' | 'submitting' | 'success' | 'existing' | 'error';

export default function ReservePage() {
  const { allShows } = useShow();
  const [searchParams] = useSearchParams();
  const preselectedShowId = searchParams.get('show');

  const reservableShows = useMemo(
    () => allShows.filter((s) => s.status !== 'archived'),
    [allShows],
  );

  const [showId, setShowId] = useState<string>(() => {
    if (preselectedShowId && reservableShows.some((s) => s.id === preselectedShowId)) {
      return preselectedShowId;
    }
    return reservableShows[0]?.id ?? '';
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedShow = reservableShows.find((s) => s.id === showId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const result = await createReservation({ name, email, showId });
      setReservation(result.reservation);
      setStatus(result.status === 'created' ? 'success' : 'existing');

      if (result.status === 'created' && selectedShow) {
        sendReservationEmail({
          name: result.reservation.name,
          email: result.reservation.email,
          accessCode: result.reservation.accessCode,
          showName: selectedShow.name,
        })
          .then(setEmailSent)
          .catch(() => setEmailSent(false));
      }
    } catch (err) {
      console.error('Reservation failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    if (!reservation) return;
    try {
      await navigator.clipboard.writeText(reservation.accessCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still read the code */
    }
  };

  const handleReset = () => {
    setReservation(null);
    setName('');
    setEmail('');
    setStatus('idle');
    setErrorMessage('');
    setEmailSent(false);
  };

  // ── Success / existing reservation view ───────────────────────────
  if (reservation && (status === 'success' || status === 'existing')) {
    return (
      <section className="page-card reserve-success">
        <h1>{status === 'existing' ? 'Welcome back.' : "You're in."}</h1>
        <p className="reserve-subtitle">
          {status === 'existing'
            ? "You already had a reservation for this show — here's your code."
            : `Reserved for ${selectedShow?.name ?? 'the show'}.`}
        </p>

        <div className="access-code-display" aria-label="Your access code">
          {reservation.accessCode.split('').map((ch, i) => (
            <span key={i} className="access-code-char">{ch}</span>
          ))}
        </div>

        {status === 'success' && (
          <p className="reserve-email-note">
            {emailSent
              ? '✓ Confirmation sent to your email.'
              : "Save this code — we'll also try to email it to you."}
          </p>
        )}

        <div className="reserve-actions">
          <button type="button" className="btn-primary" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy code'}
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Reserve another seat
          </button>
        </div>

        <p className="reserve-fineprint">
          Bring this code to the show — you'll use it to build your character
          and join the audience interactions.
        </p>
      </section>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────
  if (reservableShows.length === 0) {
    return (
      <section className="page-card">
        <h1>No shows on the schedule yet</h1>
        <p>Check back soon — new tour dates drop here first.</p>
      </section>
    );
  }

  return (
    <section className="page-card reserve-form-card">
      <h1>Reserve a seat</h1>
      <p className="reserve-subtitle">
        Pick a show, drop your name and email, and we'll send you a 6-character
        access code. You'll use the code at the show to build a character and
        vote on the chaos.
      </p>

      <form className="reserve-form" onSubmit={handleSubmit} noValidate>
        <label className="reserve-field">
          <span>Show</span>
          <select
            value={showId}
            onChange={(e) => setShowId(e.target.value)}
            disabled={status === 'submitting'}
            required
          >
            {reservableShows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === 'draft' ? ' (announcement soon)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="reserve-field">
          <span>Your name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last"
            maxLength={60}
            disabled={status === 'submitting'}
            required
          />
        </label>

        <label className="reserve-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={120}
            disabled={status === 'submitting'}
            required
          />
        </label>

        {errorMessage && <p className="reserve-error">{errorMessage}</p>}

        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Reserving…' : 'Get my access code'}
        </button>
      </form>

      <p className="reserve-fineprint">
        No payment, no account. Your email is only used to send the code and
        the occasional show announcement — never sold.
      </p>
    </section>
  );
}
