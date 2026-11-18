/**
 * GM control for audience-built townies (Green Oaks), on /admin → Show night.
 *
 *   - One switch for whether townies are on the projector at all, plus
 *     per-townie "On screen" and Show all / Hide all.
 *   - Add a townie by hand.
 *   - Hide: off the roster, the projector and the recap, and their rumors
 *     leave the Rumor Mill. The record is kept.
 *   - Delete: gone for good, with their rumors. For tests and junk.
 *
 * Replaces the older NPC panel for shows that don't use stingers; that one
 * (Honey Heist) keeps its stinger, world-vote and email tools.
 */

import { useEffect, useState, type ReactNode } from 'react';
import {
  archiveNpc,
  deleteNpc,
  setAllNpcsDisplay,
  setNpcDisplay,
  subscribeToNpcs,
  subscribeToWorldSelection,
  type NpcProfile,
  type WorldSelection,
} from '@mtp/lib/npcs/npcApi';
import { deleteRumors, listRumorsForNpc, withdrawRumorsForNpc } from '@mtp/lib/rumors';
import { CrowdingWarning, screenModeFrom } from '../../big-screen';
import { useRumorMillSession } from '../../rumor-mill';
import type { TowniesShowConfig } from '../config';
import { AddTownieForm } from './AddTownieForm';
import '../townies.css';

interface Props {
  systemId: string;
  config: TowniesShowConfig;
}

export function TowniesAdminPanel({ systemId, config }: Props) {
  const showId = config.showId;
  const fields = config.fields.filter((f) => f.fieldType === 'personal');
  const [npcs, setNpcs] = useState<NpcProfile[]>([]);
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (err: Error) => {
      console.error('townies listener failed:', err);
      setError('Lost the connection to the townie list. Reload the page.');
    };
    const unsubNpcs = subscribeToNpcs(showId, setNpcs, onErr);
    const unsubSel = subscribeToWorldSelection(showId, setSelection);
    return () => {
      unsubNpcs();
      unsubSel();
    };
  }, [showId]);

  /** Run a write; on failure say so on screen, never silently. */
  async function run(key: string, action: () => Promise<string | void>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const msg = await action();
      if (msg) setNotice(msg);
    } catch (err) {
      console.error(`townies: ${key} failed`, err);
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const session = useRumorMillSession(showId);
  const mode = screenModeFrom(session.boardOn, selection?.displayMode);
  const onScreen = npcs.filter((n) => n.showOnDisplay).length;

  function hide(npc: NpcProfile) {
    const ok = window.confirm(
      `Hide ${npc.displayName}?\n\nThey come off the roster, the projector and the recap, and any rumors they started leave the Rumor Mill. The record is kept.`,
    );
    if (!ok) return;
    run(`hide-${npc.id}`, async () => {
      const withdrawn = await withdrawRumorsForNpc(showId, npc.id);
      await archiveNpc(npc.id);
      return `${npc.displayName} is hidden${withdrawn ? `, and ${withdrawn} rumor${withdrawn === 1 ? '' : 's'} left the mill` : ''}.`;
    });
  }

  function remove(npc: NpcProfile) {
    const ok = window.confirm(
      `Delete ${npc.displayName} for good?\n\nThis also deletes every rumor they started. It can't be undone. Use Hide if you might want them back.`,
    );
    if (!ok) return;
    run(`delete-${npc.id}`, async () => {
      const rumors = await listRumorsForNpc(showId, npc.id);
      await deleteRumors(rumors.map((r) => r.id));
      await deleteNpc(npc.id);
      return `${npc.displayName} is deleted${rumors.length ? `, with ${rumors.length} rumor${rumors.length === 1 ? '' : 's'}` : ''}.`;
    });
  }

  return (
    <div className="npc-admin-panel townies">
      <div className="npc-admin-panel__header">
        <h2 className="npc-admin-panel__title">Townies · {config.showName}</h2>
        <p className="npc-admin-panel__meta">
          {npcs.length} in town · {onScreen} marked for the projector
        </p>
      </div>

      {error && <p className="townies__error" role="alert">{error}</p>}
      {notice && <p className="townies__notice" role="status">{notice}</p>}

      <section className="townies__projector" aria-label="Projector">
        <button
          type="button"
          className="btn-ghost"
          disabled={busy !== null || npcs.length === 0}
          onClick={() => run('show-all', () => setAllNpcsDisplay(showId, true))}
        >
          Mark all
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={busy !== null || onScreen === 0}
          onClick={() => run('hide-all', () => setAllNpcsDisplay(showId, false))}
        >
          Unmark all
        </button>
        <p className="townies__hint">
          The projector shows only the townies you mark, when the Big screen picker above is on
          Townies or Both.
        </p>
        <CrowdingWarning mode={mode} marked={onScreen} />
      </section>

      {adding ? (
        <AddTownieForm config={config} systemId={systemId} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn-secondary townies__add-btn" onClick={() => setAdding(true)}>
          + Add a townie
        </button>
      )}

      {npcs.length === 0 && <p className="npc-admin-panel__empty">No townies yet.</p>}
      <ol className="townies__list">
        {npcs.map((npc) => (
          <li key={npc.id} className="townies__item">
            <div className="townies__info">
              <span className="townies__name">
                {npc.displayName}
                {npc.deviceToken?.startsWith('gm-') && <span className="townies__badge">added by GM</span>}
              </span>
              <span className="townies__fields">
                {joinWithDots(
                  fields.map((f) => {
                    const val = npc.fieldValues[f.id];
                    if (!val) return null;
                    return (
                      <span key={f.id}>
                        {val}
                        {npc.fieldWriteIns?.[f.id] && (
                          <span className="townies__write-in" title="Typed in, not picked from the list">
                            {' '}(write-in)
                          </span>
                        )}
                      </span>
                    );
                  }),
                )}
              </span>
            </div>
            <div className="townies__actions">
              <button
                type="button"
                className={`townies__screen ${npc.showOnDisplay ? 'townies__screen--on' : ''}`}
                aria-pressed={!!npc.showOnDisplay}
                disabled={busy !== null}
                onClick={() => run(`screen-${npc.id}`, () => setNpcDisplay(npc.id, !npc.showOnDisplay))}
              >
                {npc.showOnDisplay ? '✓ On screen' : 'Mark for screen'}
              </button>
              <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => hide(npc)}>
                Hide
              </button>
              <button
                type="button"
                className="btn-ghost townies__delete"
                disabled={busy !== null}
                onClick={() => remove(npc)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function joinWithDots(parts: Array<ReactNode | null>): ReactNode[] {
  return parts
    .filter((p): p is ReactNode => p !== null)
    .flatMap((p, i) => (i === 0 ? [p] : [<span key={`dot-${i}`} aria-hidden="true"> · </span>, p]));
}
