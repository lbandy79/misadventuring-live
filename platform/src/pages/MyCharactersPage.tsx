/**
 * MyCharactersPage — /my-characters
 *
 * Shows all NPCs saved by this audience member, grouped by show, newest first.
 * Requires a valid localStorage session (set by ReturnPage on code/token resolution).
 * Unknown or expired sessions redirect to /return.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAudienceProfileByEmail, type AudienceProfile, type AudienceNpcRef } from '../../../src/lib/audience/audienceApi';
import { getApprovedBeatsForNpc, type Beat } from '../../../src/lib/npcs/npcApi';
import { getAudienceSession, clearAudienceSession } from '../lib/session';

type PageState = 'loading' | 'ready' | 'error';

interface CharacterEntry {
  npcRef: AudienceNpcRef;
  approvedBeats: Beat[];
}

export default function MyCharactersPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<AudienceProfile | null>(null);
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);

  useEffect(() => {
    const session = getAudienceSession();
    if (!session) {
      navigate('/return', { replace: true });
      return;
    }

    (async () => {
      try {
        const p = await getAudienceProfileByEmail(session.email);
        if (!p) {
          clearAudienceSession();
          navigate('/return', { replace: true });
          return;
        }
        setProfile(p);

        // Sort newest first, then fetch approved beats for each NPC
        const sorted = [...(p.npcs ?? [])].sort((a, b) => {
          const aTime = a.savedAt ? new Date(a.savedAt).getTime() : 0;
          const bTime = b.savedAt ? new Date(b.savedAt).getTime() : 0;
          return bTime - aTime;
        });

        const entries: CharacterEntry[] = await Promise.all(
          sorted.map(async (ref) => {
            const beats = await getApprovedBeatsForNpc(ref.npcId).catch(() => []);
            return { npcRef: ref, approvedBeats: beats };
          }),
        );

        setCharacters(entries);
        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, [navigate]);

  function handleSignOut() {
    clearAudienceSession();
    navigate('/', { replace: true });
  }

  if (state === 'loading') {
    return (
      <section className="page-card my-chars-page">
        <p className="my-chars-page__loading">Loading your characters…</p>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="page-card my-chars-page">
        <h1>Something went wrong.</h1>
        <p>We couldn't load your characters. Try again or <Link to="/return">re-enter your code</Link>.</p>
      </section>
    );
  }

  return (
    <section className="page-card my-chars-page">
      <header className="my-chars-page__header">
        <p className="my-chars-page__eyebrow">The Misadventuring Party</p>
        <h1 className="my-chars-page__title">Your Characters</h1>
        {profile?.email && (
          <p className="my-chars-page__email">{profile.email}</p>
        )}
      </header>

      {characters.length === 0 ? (
        <div className="my-chars-page__empty">
          <p>No characters saved yet.</p>
          <Link to="/shows" className="btn-primary">Find a show</Link>
        </div>
      ) : (
        <ol className="my-chars-list">
          {characters.map(({ npcRef, approvedBeats }) => (
            <li key={npcRef.npcId} className="my-chars-list__item">
              <CharacterCard npcRef={npcRef} approvedBeats={approvedBeats} />
            </li>
          ))}
        </ol>
      )}

      <button className="btn-ghost my-chars-page__signout" onClick={handleSignOut}>
        Sign out
      </button>
    </section>
  );
}

// ─── CharacterCard ────────────────────────────────────────────────────────────

function CharacterCard({
  npcRef,
  approvedBeats,
}: {
  npcRef: AudienceNpcRef;
  approvedBeats: Beat[];
}) {
  const showLabel = npcRef.showName ?? npcRef.showId;
  const savedDate = npcRef.savedAt
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
        new Date(npcRef.savedAt),
      )
    : null;

  return (
    <article className="char-card">
      <header className="char-card__header">
        <p className="char-card__show">{showLabel}</p>
        {savedDate && <p className="char-card__date">{savedDate}</p>}
        {npcRef.characterName && (
          <h2 className="char-card__name">{npcRef.characterName}</h2>
        )}
        {npcRef.revealSentence && (
          <p className="char-card__reveal">{npcRef.revealSentence}</p>
        )}
      </header>

      {approvedBeats.length > 0 && (
        <section className="char-card__stingers" aria-label="Your Stingers">
          <h3 className="char-card__stingers-title">Your Stingers</h3>
          <ol className="char-card__stingers-list">
            {approvedBeats.map((beat) => (
              <li key={beat.id} className="char-card__stinger">
                {beat.response?.assembledText && (
                  <p className="char-card__stinger-text">{beat.response.assembledText}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
