/**
 * HuntersPage — /hunters
 *
 * Cast character portfolio. Shows the signed-in user's hunters first,
 * then the rest of the party's hunters. Viewable by any signed-in cast
 * member or admin. Shareable — anyone with the link can view if signed in.
 *
 * Redirects to sign-in if the user isn't authenticated.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import {
  subscribeToAllHunterSheets,
  type HunterSheet,
} from '../../../src/lib/hunters/hunterApi';
import { Doodle } from '../components/Doodle';

const ACCENT = '#1d4e3a';
const ACCENT_INK = '#f5f0e3';
const RATING_KEYS = ['charm', 'cool', 'sharp', 'tough', 'weird'] as const;
const RATING_DISPLAY = ['Charm', 'Cool', 'Sharp', 'Tough', 'Weird'];

// ─── System JSON type (minimal — only what we need for display) ───────────────

interface RatingLine {
  charm: number;
  cool: number;
  sharp: number;
  tough: number;
  weird: number;
}

interface Move {
  name: string;
  mandatory?: boolean;
  description: string;
}

interface Playbook {
  id: string;
  name: string;
  concept: string;
  ratingLines: RatingLine[];
  moves: Move[];
  gear: string[];
}

interface MotWSystem {
  playbooks: Playbook[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HuntersPage() {
  const { user, isLoading, isCast, isCastLoading, isAdmin, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get('created');

  const [sheets, setSheets] = useState<HunterSheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [system, setSystem] = useState<MotWSystem | null>(null);

  const accentStyle = {
    '--accent': ACCENT,
    '--accent-ink': ACCENT_INK,
  } as React.CSSProperties;

  // Load system JSON for playbook lookup
  useEffect(() => {
    import('../../../src/systems/monster-of-the-week.system.json')
      .then((mod) => setSystem((mod.default ?? mod) as MotWSystem))
      .catch(() => null);
  }, []);

  // Subscribe to all hunter sheets once auth is settled
  useEffect(() => {
    if (isLoading || (user && isCastLoading)) return;
    if (!user) {
      setSheetsLoading(false);
      return;
    }
    const unsub = subscribeToAllHunterSheets((all) => {
      setSheets(all);
      setSheetsLoading(false);
    });
    return unsub;
  }, [isLoading, user, isCastLoading]);

  // ── Guard: not signed in ──────────────────────────────────────────────────

  if (isLoading || (user && isCastLoading)) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <p className="join-loading">Loading the party…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <Doodle name="nat20_dice" top="-20px" right="-24px" rotation={12} opacity={0.65} width="88px" />
        <header className="join-header">
          <p className="join-eyebrow">Monster of the Week</p>
          <h1 className="join-title">The party.</h1>
        </header>
        <p className="join-subtitle">Sign in to see the cast's hunter sheets.</p>
        <button
          type="button"
          className="btn-primary btn-block"
          onClick={() => signIn().catch(console.error)}
        >
          Sign in with Google
        </button>
      </section>
    );
  }

  // ── Split into "mine" and "the rest" ─────────────────────────────────────

  const mySheets = sheets.filter((s) => s.castMemberUid === user.uid);
  const partySheets = sheets.filter((s) => s.castMemberUid !== user.uid);

  const canCreate = isCast || isAdmin;

  function playbookFor(sheet: HunterSheet): Playbook | null {
    return system?.playbooks.find((p) => p.id === sheet.playbookId) ?? null;
  }

  return (
    <section className="page-card hunter-page" style={accentStyle} data-show="monster-of-the-week">
      <Doodle name="nat20_dice" top="-20px" right="-24px" rotation={12} opacity={0.65} width="88px" />
      <Doodle name="stars" bottom="32px" left="-16px" rotation={-10} opacity={0.45} width="70px" />

      <header className="join-header">
        <p className="join-eyebrow">Monster of the Week · June 27, 2026</p>
        <h1 className="join-title">The party.</h1>
      </header>

      {justCreated && (
        <div className="hunters-created-banner" role="status">
          Hunter sheet saved. Welcome to the party.
        </div>
      )}

      {/* My hunters */}
      <div className="hunters-section">
        <h2 className="hunters-section__title">Your hunters</h2>
        {sheetsLoading ? (
          <p className="npc-admin-panel__empty">Loading…</p>
        ) : mySheets.length === 0 ? (
          <div className="hunters-empty">
            <p>You haven't created a hunter yet.</p>
            {canCreate && (
              <Link to="/shows/monster-of-the-week/create-hunter" className="btn-primary">
                Create your hunter →
              </Link>
            )}
            {!canCreate && (
              <p className="hunters-empty__hint">
                Ask the GM to add your email to the cast list.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="hunters-grid">
              {mySheets.map((sheet) => (
                <HunterCard key={sheet.id} sheet={sheet} playbook={playbookFor(sheet)} />
              ))}
            </div>
            {canCreate && (
              <Link
                to="/shows/monster-of-the-week/create-hunter"
                className="btn-ghost hunters-create-another"
              >
                + Create another hunter
              </Link>
            )}
          </>
        )}
      </div>

      {/* Party hunters */}
      {!sheetsLoading && partySheets.length > 0 && (
        <div className="hunters-section">
          <h2 className="hunters-section__title">The rest of the party</h2>
          <div className="hunters-grid">
            {partySheets.map((sheet) => (
              <HunterCard key={sheet.id} sheet={sheet} playbook={playbookFor(sheet)} />
            ))}
          </div>
        </div>
      )}

      {!sheetsLoading && sheets.length === 0 && !canCreate && (
        <p className="npc-admin-panel__empty">
          No hunter sheets yet. Cast members create them at character creation.
        </p>
      )}
    </section>
  );
}

// ─── Hunter Card ──────────────────────────────────────────────────────────────

function HunterCard({ sheet, playbook }: { sheet: HunterSheet; playbook: Playbook | null }) {
  const [expanded, setExpanded] = useState(false);

  const line = (playbook?.ratingLines[sheet.ratingLineIndex] ?? null) as Record<string, number> | null;
  const selectedMoves = playbook?.moves.filter((m) =>
    sheet.selectedMoveIds.includes(m.name),
  ) ?? [];

  return (
    <article className="hunter-card">
      <div className="hunter-card__header">
        <div>
          <h3 className="hunter-card__name">{sheet.hunterName}</h3>
          <p className="hunter-card__playbook">{sheet.playbookName}</p>
          <p className="hunter-card__player">{sheet.castMemberName}</p>
        </div>
        <button
          type="button"
          className="hunter-card__toggle btn-ghost"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Full sheet'}
        </button>
      </div>

      {line && (
        <div className="hunter-card__ratings">
          {RATING_KEYS.map((k, i) => {
            const val = line[k] as number;
            return (
              <div key={k} className="hunter-card__rating">
                <span className="hunter-card__rating-label">{RATING_DISPLAY[i]}</span>
                <span className={[
                  'hunter-card__rating-val',
                  val > 0 ? 'ratings-row__val--pos' : val < 0 ? 'ratings-row__val--neg' : '',
                ].filter(Boolean).join(' ')}>
                  {val > 0 ? `+${val}` : val}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {expanded && (
        <div className="hunter-card__detail">
          {selectedMoves.length > 0 && (
            <div className="hunter-card__section">
              <h4 className="hunter-card__section-title">Moves</h4>
              <ul className="review-moves">
                {selectedMoves.map((m) => (
                  <li key={m.name} className="review-move">
                    <strong>{m.name}</strong>
                    <p className="review-move__desc">{m.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sheet.gear.length > 0 && (
            <div className="hunter-card__section">
              <h4 className="hunter-card__section-title">Gear</h4>
              <ul className="gear-list">
                {sheet.gear.map((item, i) => (
                  <li key={i} className="gear-item">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {Object.keys(sheet.specialMechanics).length > 0 && (
            <div className="hunter-card__section">
              <h4 className="hunter-card__section-title">Special Mechanics</h4>
              <SpecialMechanicsDisplay mechanics={sheet.specialMechanics} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Special Mechanics Display ────────────────────────────────────────────────

function SpecialMechanicsDisplay({ mechanics }: { mechanics: Record<string, unknown> }) {
  return (
    <dl className="specials-display">
      {Object.entries(mechanics).map(([key, val]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        return (
          <div key={key} className="specials-display__row">
            <dt className="specials-display__key">{label}</dt>
            <dd className="specials-display__val">
              {Array.isArray(val)
                ? val.join(', ')
                : typeof val === 'object' && val !== null
                ? <SpecialMechanicsDisplay mechanics={val as Record<string, unknown>} />
                : String(val)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
