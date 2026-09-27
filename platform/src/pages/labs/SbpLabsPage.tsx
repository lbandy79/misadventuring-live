/**
 * SbpLabsPage — /labs/sbp
 *
 * Misadventuring Labs home for Soggy Bottom Pirates: the door to the wizard,
 * your own characters in full, and the rest of the crew's characters grouped
 * by player (read-only sheets — only the owner or an admin edits).
 *
 * One subscription to every character; the split into "mine" and "crew" is
 * done here so both sections update live.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteSbpCharacter,
  deriveCharacter,
  subscribeToAllSbpCharacters,
  useAuth,
  type DerivedCharacter,
  type LoadedSbpRules,
  type SbpCharacter,
} from '@mtp/lib';
import { Doodle } from '../../components/Doodle';
import { SbpHeader, SbpPage, useSbpGate } from '../../components/sbp/SbpPage';
import { useSbpRules } from '../../components/sbp/useSbpRules';
import { DerivedSummary } from '../../components/sbp/DerivedSummary';
import { ArtThumb } from '../../components/sbp/art/Art';

const ownerLabel = (c: SbpCharacter) => c.ownerName?.trim() || c.ownerEmail || 'Unknown player';

export default function SbpLabsPage() {
  const gate = useSbpGate();
  const { user, isCast, isAdmin } = useAuth();
  const enabled = !!user && (isCast || isAdmin);
  const { rules, loading: rulesLoading } = useSbpRules(enabled);
  const [all, setAll] = useState<SbpCharacter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    return subscribeToAllSbpCharacters(setAll, (err) => {
      console.error('sbp-characters subscription failed:', err);
      setError('Could not load the crew\'s characters.');
    });
  }, [enabled]);

  const rulesReady = !!rules.classes && !!rules.origins;

  const { mine, crew } = useMemo(() => {
    const mine: SbpCharacter[] = [];
    const byOwner = new Map<string, { label: string; characters: SbpCharacter[] }>();
    for (const c of all ?? []) {
      if (c.ownerUid === user?.uid) {
        mine.push(c);
        continue;
      }
      const group = byOwner.get(c.ownerUid) ?? { label: ownerLabel(c), characters: [] };
      group.characters.push(c);
      byOwner.set(c.ownerUid, group);
    }
    const crew = [...byOwner.values()].sort((a, b) => a.label.localeCompare(b.label));
    return { mine, crew };
  }, [all, user?.uid]);

  if (gate) return gate;

  async function remove(c: SbpCharacter) {
    if (!c.id || !confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    setBusy(c.id);
    try {
      await deleteSbpCharacter(c.id);
    } catch (err) {
      console.error('sbp character delete failed:', err);
      setError(`Couldn't delete: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SbpPage wide>
      <Doodle name="shipwreck" top="-18px" right="-24px" rotation={8} opacity={0.7} width="120px" />
      <SbpHeader title="Soggy Bottom Pirates" />
      <p className="join-subtitle">
        The living sourcebook, while we playtest. Build characters, move them up and down levels, see what breaks.
      </p>

      <div className="sbp-actions">
        <Link to="/labs/sbp/characters/new" className={`btn-primary ${rulesReady ? '' : 'btn-disabled'}`} aria-disabled={!rulesReady}>
          New character
        </Link>
        {!rulesLoading && !rulesReady && (
          <span className="sbp-muted">The rules files haven't been uploaded yet.</span>
        )}
      </div>

      {error && <p className="wizard-error">{error}</p>}

      <h2 className="wizard-subheading">My characters</h2>
      {all === null ? (
        <p className="join-loading">Loading…</p>
      ) : mine.length === 0 ? (
        <p className="sbp-muted">None yet. Start with a quick playtest build.</p>
      ) : (
        <ul className="sbp-character-list">
          {mine.map((c) => (
            <MyCharacterCard key={c.id} c={c} rules={rules} rulesReady={rulesReady} busy={busy === c.id} onDelete={() => remove(c)} />
          ))}
        </ul>
      )}

      <h2 className="wizard-subheading sbp-crew__heading">The crew</h2>
      {all === null ? null : crew.length === 0 ? (
        <p className="sbp-muted">Nobody else has built a character yet.</p>
      ) : (
        <div className="sbp-crew">
          {crew.map((group) => (
            <section key={group.label} className="sbp-crew__player">
              <h3 className="sbp-crew__player-name">{group.label}</h3>
              <ul className="sbp-crew__list">
                {group.characters.map((c) => (
                  <CrewRow
                    key={c.id}
                    c={c}
                    derived={rulesReady ? deriveCharacter(c, rules) : null}
                    canDelete={isAdmin}
                    busy={busy === c.id}
                    onDelete={() => remove(c)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </SbpPage>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function MyCharacterCard({ c, rules, rulesReady, busy, onDelete }: {
  c: SbpCharacter;
  rules: LoadedSbpRules;
  rulesReady: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  const d = rulesReady ? deriveCharacter(c, rules) : null;
  return (
    <li className="sbp-character-card">
      <div className="sbp-character-card__head">
        <ArtThumb entityId={c.classId} alt="" className="sbp-character-card__art" />
        <h3 className="sbp-character-card__name">
          <Link to={`/labs/sbp/characters/${c.id}`}>{c.name}</Link>
        </h3>
        <div className="sbp-character-card__actions">
          <Link to={`/labs/sbp/characters/${c.id}`} className="btn-primary sbp-edit">Open sheet</Link>
          <Link to={`/labs/sbp/characters/${c.id}/edit`} className="btn-secondary sbp-edit">Edit build</Link>
          <button type="button" className="btn-ghost sbp-danger" onClick={onDelete} disabled={busy}>
            {busy ? '…' : 'Delete'}
          </button>
        </div>
      </div>
      {d ? (
        <>
          {!d.ok && (
            <p className="wizard-warning">
              This character needs fixing — something it uses has changed in the rules. Open Edit to re-pick it.
            </p>
          )}
          {(d.rulesOutdated.classes || d.rulesOutdated.origins) && (
            <p className="wizard-derived-notice">Rules updated since this character was built.</p>
          )}
          {d.issues.length > 0 && <p className="wizard-warning">{d.issues.join(' ')}</p>}
          <DerivedSummary d={d} compact />
        </>
      ) : (
        <p className="sbp-muted">Level {c.level} · {c.classId.replace(/^class\./, '')}</p>
      )}
    </li>
  );
}

function CrewRow({ c, derived: d, canDelete, busy, onDelete }: {
  c: SbpCharacter;
  derived: DerivedCharacter | null;
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  const line = d
    ? `Level ${d.level} ${d.species?.name ?? '?'} ${d.class?.name ?? '?'}${d.archetype ? ` (${d.archetype.name})` : ''} · ${d.background?.name ?? '?'}`
    : `Level ${c.level} · ${c.classId.replace(/^class\./, '')}`;
  return (
    <li className="sbp-crew__row">
      <div className="sbp-crew__row-main">
        <ArtThumb entityId={c.classId} alt="" className="sbp-crew__art" />
        <Link to={`/labs/sbp/characters/${c.id}`} className="sbp-crew__row-name">{c.name}</Link>
        <span className="sbp-crew__row-line">{line}</span>
        {d && !d.ok && <span className="sbp-flag sbp-flag--playtest" title={d.issues.join(' ')}>needs fixing</span>}
        {d && d.pendingChoices.length > 0 && <span className="sbp-flag sbp-flag--draft">{d.pendingChoices.length} unpicked</span>}
      </div>
      <div className="sbp-crew__row-side">
        {d && <span className="sbp-crew__hp" title={d.hitPoints.note}>HP {d.hitPoints.max}</span>}
        {canDelete && (
          <button type="button" className="btn-ghost sbp-danger" onClick={onDelete} disabled={busy}>
            {busy ? '…' : 'Delete'}
          </button>
        )}
      </div>
    </li>
  );
}
