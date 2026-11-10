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
  allHogwash,
  approveRumor,
  cardLabel,
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
  const rejectedCount = rumors.filter((r) => r.status === 'rejected').length;
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
        <fieldset className="rumor-admin__suits">
          <legend>Trump Suit (as drawn on stage)</legend>
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
          <button
            type="button"
            className={session.boardOn ? 'btn-secondary' : 'btn-primary'}
            aria-pressed={session.boardOn}
            disabled={busy !== null}
            onClick={() => run('board', () => setRumorMill(showId, { boardOn: !session.boardOn }))}
          >
            {session.boardOn ? 'Board is ON the projector · take it down' : 'Board is OFF · put it on the projector'}
          </button>
          <Link to={`/shows/${showSlug}/display`} target="_blank" rel="noreferrer" className="rumor-admin__link">
            Open projector view ↗
          </Link>
        </div>
      </div>

      {!trump && (
        <p className="rumor-admin__hint">
          Pick the Trump Suit before approving. Each approved rumor gets a secret card: Trump Suit
          means it's true.
        </p>
      )}

      {needsPick && (
        <p className="rumor-admin__hint rumor-admin__hint--pick" role="status">
          Every rumor came up hogwash. The book says the Narrator picks one to be true: use
          “Make it true” on your favourite below.
        </p>
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
                Approve + draw
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy !== null}
                onClick={() => run(`reject-${r.id}`, () => rejectRumor(r.id))}
              >
                Reject
              </button>
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
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RumorText({ rumor, leadIn }: { rumor: Rumor; leadIn: string }) {
  return (
    <p className="rumor-admin__text">
      <span className="rumor-admin__byline">{rumor.npcName} {leadIn}</span>{' '}
      {rumor.text}
    </p>
  );
}
