/**
 * ReturnPage — /return
 *
 * Resolves a magic link token from ?token=XYZ, sets a 90-day localStorage
 * session, and redirects to the audience member's most recent show.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getAudienceProfileByToken } from '../../../src/lib/audience/audienceApi';
import { setAudienceSession } from '../lib/session';
import type { AudienceProfile } from '../../../src/lib/audience/audienceApi';

type Status = 'resolving' | 'not-found' | 'error' | 'no-token';

function mostRecentShowId(profile: AudienceProfile): string | null {
  if (!profile.npcs?.length) return null;
  const sorted = [...profile.npcs].sort((a, b) =>
    (b.savedAt ?? '').localeCompare(a.savedAt ?? ''),
  );
  return sorted[0].showId ?? null;
}

export default function ReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>(token ? 'resolving' : 'no-token');

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
        const showId = mostRecentShowId(profile);
        navigate(showId ? `/shows/${showId}/join` : '/shows', { replace: true });
      } catch {
        setStatus('error');
      }
    })();
  }, [token, navigate]);

  if (status === 'resolving') {
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
        <h1 className="return-page__title">This link has expired.</h1>
        <p className="return-page__subtitle">
          Magic links are single-use. Find your show below to jump back in.
        </p>
      </header>
      <Link className="btn-primary return-page__submit" to="/shows">
        Browse shows
      </Link>
    </section>
  );
}
