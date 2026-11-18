/**
 * GM control for the Rumor Mill, on /admin.
 *
 *   1. Set the session's Trump Suit (whatever was drawn on stage).
 *   2. Open the mill so phones can send rumors.
 *   3. Approve a rumor: it goes into circulation and the app secretly draws
 *      its card. Only this panel ever sees the card.
 *   4. When the story proves a rumor, reveal it: the stamp appears on the
 *      projector and on the author's phone.
 *
 * Renders nothing for shows without `showConfig.rumorMill`.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addGmRumor,
  allHogwash,
  approveRumor,
  cardLabel,
  deleteRumors,
  overrideRumorDraw,
  rejectRumor,
  revealRumor,
  setRumorMill,
  subscribeToAllRumors,
  subscribeToRumorDraws,
  withdrawRumor,
  SUITS,
  SUIT_LABEL,
  SUIT_SYMBOL,
  type Rumor,
  type RumorDraw,
} from '@mtp/lib/rumors';
import { subscribeToNpcs, type NpcProfile } from '@mtp/lib/npcs/npcApi';
import { buildByline } from '../config';
import { useRumorMillForSystem, useRumorMillSession } from '../hooks/useRumorMill';
import '../rumor-mill.css';

interface Props {
  /** Registry id, used for the projector link (/shows/:id/display). */
  showSlug: string;
  systemId: string;
}

export function RumorMillAdminPanel({ showSlug, systemId }: Props) {
  const mill = useRumorMillForSystem(systemId);
  const showId = mill?.showId;
  const session = useRumorMillSession(showId);
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const [draws, setDraws] = useState<Record<string, RumorDraw>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [townies, setTownies] = useState<NpcProfile[]>([]);
  const [adding, setAdding] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    if (!showId) return;
    return subscribeToNpcs(showId, setTownies);
  }, [showId]);

  useEffect(() => {
    if (!showId) return;
    const onErr = (err: Error) => {
      console.error('rumor mill listener failed:', err);
      setError('Lost the connection to the rumor mill. Reload the page.');
    };
    const unsubRumors = subscribeToAllRumors(showId, setRumors, onErr);
    const unsubDraws = subscribeToRumorDraws(showId, setDraws, onErr);
    return () => {
      unsubRumors();
      unsubDraws();
    };
  }, [showId]);

  if (!mill || !showId) return null;
  const { copy } = mill.config;

  /** Run a write, and say so on screen if it fails (never silently). */
  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(`rumor mill: ${key} failed`, err);
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const pending = rumors.filter((r) => r.status === 'pending');
  const circulating = rumors.filter((r) => r.status === 'circulating');
  const rejected = rumors.filter((r) => r.status === 'rejected');
  const rejectedCount = rejected.length;

  /** Delete for good, after asking. */
  function remove(r: Rumor) {
    const ok = window.confirm(
      `Delete this rumor for good?\n\n“${r.text}”\n\nIts secret card goes too. It can't be undone; Reject or Take off the board keep the record.`,
    );
    if (ok) run(`delete-${r.id}`, () => deleteRumors([r.id]));
  }

  const deleteButton = (r: Rumor) => (
    <button type="button" className="btn-ghost rumor-admin__delete" disabled={busy !== null} onClick={() => remove(r)}>
      Delete
    </button>
  );
  const tested = circulating.map((r) => draws[r.id]).filter((d): d is RumorDraw => !!d);
  const needsPick = allHogwash(tested);
  const trump = session.trumpSuit;

  return (
    <div className="npc-admin-panel rumor-admin">
      <div className="npc-admin-panel__header">
        <h2 className="npc-admin-panel__title">Rumor Mill · {mill.showName}</h2>
        <p className="npc-admin-panel__meta">
          {pending.length} waiting · {circulating.length} in circulation · {rejectedCount} rejected
        </p>
      </div>

      {error && <p className="rumor-admin__error" role="alert">{error}</p>}

      <div className="rumor-admin__controls">
        <fieldset className={`rumor-admin__suits ${trump ? '' : 'rumor-admin__suits--needed'}`}>
          <legend>Step 1 · Trump Suit (as drawn on stage)</legend>
          <p className="rumor-admin__suit-status" aria-live="polite">
            {trump ? (
              <>
                Trump Suit is <strong>{SUIT_SYMBOL[trump]} {SUIT_LABEL[trump]}</strong>. An approved
                rumor that secretly draws one is true.
              </>
            ) : (
              <>
                <strong>Not picked yet.</strong> You can't approve rumors until you pick the suit you
                drew on stage.
              </>
            )}
          </p>
          {SUITS.map((suit) => (
            <button
              key={suit}
              type="button"
              className={`rumor-admin__suit ${trump === suit ? 'rumor-admin__suit--on' : ''}`}
              aria-pressed={trump === suit}
              disabled={busy !== null}
              onClick={() => run('trump', () => setRumorMill(showId, { trumpSuit: suit }))}
            >
              <span aria-hidden="true">{SUIT_SYMBOL[suit]}</span> {SUIT_LABEL[suit]}
            </button>
          ))}
        </fieldset>

        <div className="rumor-admin__toggles">
          <button
            type="button"
            className={session.open ? 'btn-secondary' : 'btn-primary'}
            aria-pressed={session.open}
            disabled={busy !== null}
            onClick={() => run('open', () => setRumorMill(showId, { open: !session.open }))}
          >
            {session.open ? 'Mill is OPEN · close it' : 'Mill is CLOSED · open it'}
          </button>
          <span className="rumor-admin__board-note">
            {session.boardOn ? 'Board is on the projector.' : 'Board is off the projector.'} Use the
            Big screen picker above to change it.
          </span>
          <Link to={`/shows/${showSlug}/display`} target="_blank" rel="noreferrer" className="rumor-admin__link">
            Open projector view ↗
          </Link>
        </div>
      </div>

      {needsPick && (
        <p className="rumor-admin__hint rumor-admin__hint--pick" role="status">
          Every rumor came up hogwash. The book says the Narrator picks one to be true: use
          “Make it true” on your favourite below.
        </p>
      )}

      {adding ? (
        <AddRumorForm
          maxLength={mill.config.maxLength}
          leadIn={copy.leadIn}
          townies={townies.map((t) => ({
            id: t.id,
            byline: buildByline(mill.config.bylineTemplate, t.displayName, t.fieldValues),
          }))}
          onCancel={() => setAdding(false)}
          onSubmit={(input) =>
            run('add', async () => {
              await addGmRumor({ showId, ...input });
              setAdding(false);
            })
          }
          busy={busy === 'add'}
        />
      ) : (
        <button type="button" className="btn-secondary rumor-admin__add-btn" onClick={() => setAdding(true)}>
          + Add a rumor
        </button>
      )}

      <h3 className="rumor-admin__heading">Waiting for you ({pending.length})</h3>
      {pending.length === 0 && <p className="npc-admin-panel__empty">Nothing waiting.</p>}
      <ol className="rumor-admin__list">
        {pending.map((r) => (
          <li key={r.id} className="rumor-admin__item">
            <RumorText rumor={r} leadIn={copy.leadIn} />
            <div className="rumor-admin__actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!trump || busy !== null}
                onClick={() => trump && run(`approve-${r.id}`, () => approveRumor(r, trump))}
              >
                {trump ? 'Approve + draw' : 'Pick a Trump Suit first ↑'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy !== null}
                onClick={() => run(`reject-${r.id}`, () => rejectRumor(r.id))}
              >
                Reject
              </button>
              {deleteButton(r)}
            </div>
          </li>
        ))}
      </ol>

      <h3 className="rumor-admin__heading">In circulation ({circulating.length})</h3>
      {circulating.length === 0 && <p className="npc-admin-panel__empty">No rumors going around yet.</p>}
      <ol className="rumor-admin__list">
        {circulating.map((r) => {
          const draw = draws[r.id];
          return (
            <li key={r.id} className="rumor-admin__item">
              <RumorText rumor={r} leadIn={copy.leadIn} />
              <p className="rumor-admin__secret">
                {draw ? (
                  <>
                    <span className="rumor-admin__card">{cardLabel(draw.card)}</span>{' '}
                    Secretly <strong>{draw.isTrue ? 'TRUE' : 'HOGWASH'}</strong>
                    {draw.overridden && ' (your pick)'}
                  </>
                ) : (
                  'No card drawn.'
                )}
                {' · '}
                {r.verdict
                  ? `Revealed on screen as ${r.verdict === 'true' ? 'TRUE' : 'HOGWASH'}`
                  : 'Not revealed'}
              </p>
              <div className="rumor-admin__actions">
                {draw && !r.verdict && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`reveal-${r.id}`, () => revealRumor(r.id, draw.isTrue ? 'true' : 'false'))
                    }
                  >
                    Reveal: {draw.isTrue ? 'TRUE' : 'HOGWASH'}
                  </button>
                )}
                {r.verdict && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy !== null}
                    onClick={() => run(`hide-${r.id}`, () => revealRumor(r.id, null))}
                  >
                    Hide the stamp
                  </button>
                )}
                {draw && !r.verdict && (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy !== null}
                    onClick={() => run(`flip-${r.id}`, () => overrideRumorDraw(r.id, !draw.isTrue))}
                  >
                    {draw.isTrue ? 'Make it hogwash' : 'Make it true'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy !== null}
                  onClick={() => run(`withdraw-${r.id}`, () => withdrawRumor(r.id))}
                >
                  Take off the board
                </button>
                {deleteButton(r)}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className="btn-ghost rumor-admin__toggle-rejected"
        aria-expanded={showRejected}
        onClick={() => setShowRejected((v) => !v)}
        disabled={rejectedCount === 0}
      >
        {showRejected ? 'Hide' : 'Show'} rejected and withdrawn ({rejectedCount})
      </button>
      {showRejected && (
        <ol className="rumor-admin__list">
          {rejected.map((r) => (
            <li key={r.id} className="rumor-admin__item rumor-admin__item--rejected">
              <RumorText rumor={r} leadIn={copy.leadIn} />
              <div className="rumor-admin__actions">{deleteButton(r)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RumorText({ rumor, leadIn }: { rumor: Rumor; leadIn: string }) {
  return (
    <p className="rumor-admin__text">
      <span className="rumor-admin__byline">{rumor.npcName} {leadIn}</span>{' '}
      {rumor.text}
      {rumor.source === 'gm' && <span className="rumor-admin__gm-badge">added by GM</span>}
    </p>
  );
}

const OWN_NAME = '__own__';

/** GM: start a rumor, signed by a townie or by any name you type. */
function AddRumorForm({
  townies,
  maxLength,
  leadIn,
  busy,
  onSubmit,
  onCancel,
}: {
  townies: Array<{ id: string; byline: string }>;
  maxLength: number;
  leadIn: string;
  busy: boolean;
  onSubmit: (input: { npcId: string; npcName: string; text: string }) => void;
  onCancel: () => void;
}) {
  const [who, setWho] = useState<string>(townies[0]?.id ?? OWN_NAME);
  const [ownName, setOwnName] = useState('');
  const [text, setText] = useState('');
  const townie = townies.find((t) => t.id === who);
  const npcName = who === OWN_NAME ? ownName.trim() : (townie?.byline ?? '');
  const ready = npcName.length > 0 && text.trim().length > 0;

  return (
    <form
      className="rumor-admin__add"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) onSubmit({ npcId: townie?.id ?? '', npcName, text: text.trim() });
      }}
    >
      <h3 className="rumor-admin__heading">Add a rumor</h3>
      <p className="rumor-admin__add-note">
        Goes into “Waiting for you” like any other. Yours don't count against anyone's limit and
        work with the mill closed.
      </p>
      <label className="rumor-admin__add-field">
        <span>Who heard it</span>
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          {townies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.byline}
            </option>
          ))}
          <option value={OWN_NAME}>Someone else (type a name)…</option>
        </select>
      </label>
      {who === OWN_NAME && (
        <label className="rumor-admin__add-field">
          <span>Name</span>
          <input value={ownName} onChange={(e) => setOwnName(e.target.value)} maxLength={160} placeholder="Mrs. Vanderbilt" />
        </label>
      )}
      <label className="rumor-admin__add-field">
        <span>
          …{leadIn} ({maxLength - text.length} left)
        </span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={maxLength} rows={3} />
      </label>
      <div className="rumor-admin__actions">
        <button type="submit" className="btn-primary" disabled={!ready || busy}>
          {busy ? 'Adding…' : 'Add to the queue'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
