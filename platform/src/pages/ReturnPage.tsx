/**
 * ReturnPage — /return
 *
 * Two paths to resolution:
 *   1. URL token: /return?token=XYZ — auto-resolves on mount
 *   2. Manual code entry — 6-char access code typed by the audience member
 *
 * On success: store a 90-day localStorage session → redirect to /my-characters.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  getAudienceProfileByToken,
  getAudienceProfileByCode,
} from '../../../src/lib/audience/audienceApi';
import { setAudienceSession } from '../lib/session';

type Status = 'idle' | 'resolving' | 'not-found' | 'error';

export default function ReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>(token ? 'resolving' : 'idle');
  const [hint, setHint] = useState('');

  // Auto-resolve magic link token on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const profile = await getAudienceProfileByToken(token);
        if (!profile) {
          setStatus('not-found');
          return;
        }
        setAudienceSession(profile.email);
        navigate('/my-characters', { replace: true });
      } catch {
        setStatus('error');
      }
    })();
  }, [token, navigate]);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || status === 'resolving') return;
    setStatus('resolving');
    setHint('');
    try {
      const profile = await getAudienceProfileByCode(trimmed);
      if (!profile) {
        setStatus('not-found');
        setHint('That code didn\'t match anything. Double-check it and try again.');
        return;
      }
      setAudienceSession(profile.email);
      navigate('/my-characters', { replace: true });
    } catch {
      setStatus('error');
      setHint('Something went sideways. Try again.');
    }
  }

  if (status === 'resolving' && token) {
    return (
      <section className="page-card return-page">
        <p className="return-page__resolving">Finding your character…</p>
      </section>
    );
  }

  return (
    <section className="page-card return-page">
      <header className="return-page__header">
        <p className="return-page__eyebrow">The Misadventuring Party</p>
        <h1 className="return-page__title">Come back to your character.</h1>
        <p className="return-page__subtitle">
          Enter the code from your confirmation email.
        </p>
      </header>

      <form className="return-page__form" onSubmit={handleCodeSubmit} noValidate>
        <input
          className="return-page__code-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (status === 'not-found') setStatus('idle');
          }}
          placeholder="ABC123"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          disabled={status === 'resolving'}
        />
        <button
          className="btn-primary return-page__submit"
          type="submit"
          disabled={code.trim().length < 6 || status === 'resolving'}
        >
          {status === 'resolving' ? 'Checking…' : 'Find my character'}
        </button>
      </form>

      {hint && (
        <p className="return-page__hint" role="alert">{hint}</p>
      )}

      {status === 'not-found' && !hint && (
        <p className="return-page__hint" role="alert">
          That code didn't match anything. Double-check it and try again.
        </p>
      )}

      {status === 'error' && !hint && (
        <p className="return-page__hint" role="alert">
          Something went sideways. Try again.
        </p>
      )}

      <p className="return-page__no-code">
        No code yet?{' '}
        <Link to="/shows">Find a show and save your character.</Link>
      </p>
    </section>
  );
}
