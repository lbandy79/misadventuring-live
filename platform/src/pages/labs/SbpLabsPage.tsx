/**
 * SbpLabsPage — /labs/sbp
 *
 * Misadventuring Labs home for Soggy Bottom Pirates: your characters, with a
 * door to the wizard. Phase 4 adds the sheet route these cards will open;
 * phase 5 grows this into the crew-wide party view.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteSbpCharacter,
  deriveCharacter,
  subscribeToMySbpCharacters,
  useAuth,
  type SbpCharacter,
} from '@mtp/lib';
import { Doodle } from '../../components/Doodle';
import { SbpHeader, SbpPage, useSbpGate } from '../../components/sbp/SbpPage';
import { useSbpRules } from '../../components/sbp/useSbpRules';
import { DerivedSummary } from '../../components/sbp/DerivedSummary';

export default function SbpLabsPage() {
  const gate = useSbpGate();
  const { user, isCast, isAdmin } = useAuth();
  const enabled = !!user && (isCast || isAdmin);
  const { rules, loading: rulesLoading } = useSbpRules(enabled);
  const [mine, setMine] = useState<SbpCharacter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;
    return subscribeToMySbpCharacters(user.uid, setMine, (err) => {
      console.error('sbp-characters subscription failed:', err);
      setError('Could not load your characters.');
    });
  }, [enabled, user?.uid]);

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

  const rulesReady = !!rules.classes && !!rules.origins;

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
      {mine === null ? (
        <p className="join-loading">Loading…</p>
      ) : mine.length === 0 ? (
        <p className="sbp-muted">None yet. Start with a quick playtest build.</p>
      ) : (
        <ul className="sbp-character-list">
          {mine.map((c) => {
            const d = rulesReady ? deriveCharacter(c, rules) : null;
            return (
              <li key={c.id} className="sbp-character-card">
                <div className="sbp-character-card__head">
                  <h3 className="sbp-character-card__name">{c.name}</h3>
                  <div className="sbp-character-card__actions">
                    <button type="button" className="btn-ghost sbp-danger" onClick={() => remove(c)} disabled={busy === c.id}>
                      {busy === c.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
                {d ? (
                  <>
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
          })}
        </ul>
      )}
    </SbpPage>
  );
}
