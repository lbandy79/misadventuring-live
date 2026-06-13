/**
 * HuntersPage — /hunters
 *
 * Cast character portfolio. Shows the signed-in user's hunters first,
 * then the rest of the party's hunters. Each card expands to the full
 * character sheet (same layout as the review step: Luck/Harm/XP tracks,
 * all moves, gear, specials, Basic Moves quick reference).
 *
 * Own hunters get an Edit button that returns to the creation wizard.
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

// ─── System JSON types ────────────────────────────────────────────────────────

interface RatingLine {
  charm: number; cool: number; sharp: number; tough: number; weird: number;
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
  luckSpecial?: string;
}

interface BasicMove {
  id: string;
  name: string;
  roll: string;
  trigger: string;
  results: Record<string, string>;
}

interface MotWSystem {
  playbooks: Playbook[];
  luck: { boxes: number };
  harm: { track: number; unstableAt: number };
  basicMoves: BasicMove[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HuntersPage() {
  const { user, isLoading, isCast, isCastLoading, isAdmin, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get('created');

  const [sheets, setSheets] = useState<HunterSheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [system, setSystem] = useState<MotWSystem | null>(null);

  const accentStyle = { '--accent': ACCENT, '--accent-ink': ACCENT_INK } as React.CSSProperties;

  useEffect(() => {
    import('../../../src/systems/monster-of-the-week.system.json')
      .then((mod) => setSystem((mod.default ?? mod) as unknown as MotWSystem))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (isLoading || (user && isCastLoading)) return;
    if (!user) { setSheetsLoading(false); return; }
    const unsub = subscribeToAllHunterSheets((all) => {
      setSheets(all);
      setSheetsLoading(false);
    });
    return unsub;
  }, [isLoading, user, isCastLoading]);

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
              <p className="hunters-empty__hint">Ask the GM to add your email to the cast list.</p>
            )}
          </div>
        ) : (
          <>
            <div className="hunters-grid">
              {mySheets.map((sheet) => (
                <HunterCard
                  key={sheet.id}
                  sheet={sheet}
                  playbook={playbookFor(sheet)}
                  system={system}
                  isOwn
                />
              ))}
            </div>
            {canCreate && (
              <Link to="/shows/monster-of-the-week/create-hunter" className="btn-ghost hunters-create-another">
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
              <HunterCard
                key={sheet.id}
                sheet={sheet}
                playbook={playbookFor(sheet)}
                system={system}
                isOwn={false}
              />
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

function HunterCard({
  sheet,
  playbook,
  system,
  isOwn,
}: {
  sheet: HunterSheet;
  playbook: Playbook | null;
  system: MotWSystem | null;
  isOwn: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const line = (playbook?.ratingLines[sheet.ratingLineIndex] ?? null) as Record<string, number> | null;
  const selectedMoves = playbook?.moves.filter((m) => sheet.selectedMoveIds.includes(m.name)) ?? [];

  return (
    <article className="hunter-card">
      {/* ── Card header — always visible ── */}
      <div className="hunter-card__header">
        <div>
          <h3 className="hunter-card__name">{sheet.hunterName}</h3>
          <p className="hunter-card__playbook">{sheet.playbookName}</p>
          <p className="hunter-card__player">{sheet.castMemberName}</p>
        </div>
        <div className="hunter-card__actions">
          {isOwn && (
            <Link
              to={`/shows/monster-of-the-week/create-hunter?edit=${sheet.id}`}
              className="btn-ghost hunter-card__edit-btn"
            >
              Edit
            </Link>
          )}
          <button
            type="button"
            className="hunter-card__toggle btn-ghost"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded ? 'Collapse' : 'Full sheet'}
          </button>
        </div>
      </div>

      {/* ── Ratings row — always visible ── */}
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

      {/* ── Full sheet — expanded ── */}
      {expanded && (
        <div className="hunter-card__full-sheet">
          <div className="hunter-card__sheet-actions">
            <button
              type="button"
              className="btn-ghost hunter-card__print-btn"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>
          </div>

          <div className="motw-sheet-grid">

            {/* Luck */}
            {system && (
              <div className="motw-sheet-section">
                <h4 className="motw-sheet-section-title">Luck</h4>
                <LuckTrack boxes={system.luck.boxes} />
                {playbook?.luckSpecial && (
                  <p className="motw-sheet-luck-special">{playbook.luckSpecial}</p>
                )}
              </div>
            )}

            {/* Harm */}
            {system && (
              <div className="motw-sheet-section">
                <h4 className="motw-sheet-section-title">Harm</h4>
                <HarmTrack track={system.harm.track} unstableAt={system.harm.unstableAt} />
                <p className="motw-sheet-harm-note">Unstable at {system.harm.unstableAt}+</p>
              </div>
            )}

            {/* XP */}
            <div className="motw-sheet-section motw-sheet-wide">
              <h4 className="motw-sheet-section-title">Experience</h4>
              <div className="motw-xp-track">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="motw-xp-box" />
                ))}
              </div>
              <p className="motw-sheet-harm-note">Mark on a miss (6−) or when a move says to. 5 marks = level up.</p>
            </div>

            {/* Moves */}
            {selectedMoves.length > 0 && (
              <div className="motw-sheet-section motw-sheet-wide">
                <h4 className="motw-sheet-section-title">Moves</h4>
                <div className="motw-sheet-moves">
                  {selectedMoves.map((m) => (
                    <div key={m.name} className={['motw-sheet-move', m.mandatory ? 'mandatory' : ''].filter(Boolean).join(' ')}>
                      <div className="motw-sheet-move-name">
                        {m.name}
                        {m.mandatory && <span className="motw-mandatory-badge">Always</span>}
                      </div>
                      <p className="motw-sheet-move-desc">{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gear */}
            {sheet.gear.length > 0 && (
              <div className="motw-sheet-section">
                <h4 className="motw-sheet-section-title">Gear</h4>
                <ul className="motw-sheet-gear">
                  {sheet.gear.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}

            {/* Special Mechanics */}
            {Object.keys(sheet.specialMechanics).length > 0 && (
              <div className="motw-sheet-section motw-sheet-wide">
                <h4 className="motw-sheet-section-title">Special Mechanics</h4>
                <SpecialMechanicsDisplay mechanics={sheet.specialMechanics} />
              </div>
            )}

          </div>

          {/* Basic Moves Reference */}
          {system && system.basicMoves.length > 0 && (
            <div className="motw-reference-section">
              <h4 className="motw-sheet-section-title">Basic Moves Quick Reference</h4>
              <div className="motw-basic-moves-grid">
                {system.basicMoves.map((move) => (
                  <div key={move.id} className="motw-basic-move-card">
                    <div className="motw-basic-move-head">
                      <span className="motw-basic-move-name">{move.name}</span>
                      <span className="motw-basic-move-roll">+{move.roll}</span>
                    </div>
                    <p className="motw-basic-move-trigger">{move.trigger}</p>
                    <ul className="motw-basic-move-results">
                      {Object.entries(move.results).map(([key, val]) => (
                        <li key={key}><strong>{key}:</strong> {val}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Track components ─────────────────────────────────────────────────────────

function LuckTrack({ boxes }: { boxes: number }) {
  return (
    <div className="motw-luck-track">
      {Array.from({ length: boxes }, (_, i) => <span key={i} className="motw-luck-box" />)}
    </div>
  );
}

function HarmTrack({ track, unstableAt }: { track: number; unstableAt: number }) {
  return (
    <div className="motw-harm-track">
      {Array.from({ length: track }, (_, i) => (
        <span key={i} className={['motw-harm-box', i >= unstableAt - 1 ? 'unstable' : ''].filter(Boolean).join(' ')} />
      ))}
      <span className="motw-harm-dead">✝</span>
    </div>
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
