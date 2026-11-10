/**
 * Phone view: a townie's player starts rumors and watches what happens to
 * them. Sits under the townie card on the join page.
 *
 * Up to `config.maxPerPerson` rumors each (firestore.rules caps it at 3 via
 * the doc id), only while the GM has the mill open. A rumor can't be edited
 * once sent.
 */

import { useEffect, useId, useState } from 'react';
import { useAuth } from '@mtp/lib';
import { submitRumor, subscribeToMyRumors, type Rumor } from '@mtp/lib/rumors';
import type { RumorMillConfig } from '../config';
import { useRumorMillSession } from '../hooks/useRumorMill';
import { VerdictStamp } from './VerdictStamp';
import '../rumor-mill.css';

interface Props {
  /** Firestore episode id. */
  showId: string;
  npcId: string;
  /** "Dolores, the very sweaty bingo caller" */
  byline: string;
  config: RumorMillConfig;
}

export function RumorMillPhone({ showId, npcId, byline, config }: Props) {
  const { copy } = config;
  const { user } = useAuth();
  const uid = user?.uid;
  const session = useRumorMillSession(showId);
  const [myRumors, setMyRumors] = useState<Rumor[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  useEffect(() => {
    if (!uid) return;
    return subscribeToMyRumors(showId, uid, setMyRumors, (err) =>
      console.error('my rumors listener failed:', err),
    );
  }, [showId, uid]);

  const usedSlots = new Set(myRumors.map((r) => r.slot));
  const nextSlot = Array.from({ length: config.maxPerPerson }, (_, i) => i).find(
    (i) => !usedSlots.has(i),
  );
  const canSend = session.open && nextSlot !== undefined && !!uid;
  const trimmed = text.trim();
  const left = config.maxLength - text.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || !trimmed || sending || nextSlot === undefined) return;
    setSending(true);
    setError(null);
    try {
      await submitRumor({ showId, slot: nextSlot, npcId, npcName: byline, text: trimmed });
      setText('');
    } catch (err) {
      console.error('submitRumor failed:', err);
      setError("That one didn't go through. Try again.");
    } finally {
      setSending(false);
    }
  }

  // Nothing to show: mill closed and this person never sent anything.
  if (!session.open && myRumors.length === 0) {
    return (
      <section className="rumor-phone" aria-labelledby={`${inputId}-title`}>
        <h2 id={`${inputId}-title`} className="rumor-phone__title">{copy.phoneTitle}</h2>
        <p className="rumor-phone__note">{copy.closedNote}</p>
      </section>
    );
  }

  return (
    <section className="rumor-phone" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className="rumor-phone__title">{copy.phoneTitle}</h2>
      <p className="rumor-phone__subtitle">{copy.phoneSubtitle}</p>

      {canSend && (
        <form className="rumor-phone__form" onSubmit={handleSubmit}>
          <label htmlFor={inputId} className="rumor-phone__lead">
            <strong>{byline}</strong> {copy.leadIn}
          </label>
          <textarea
            id={inputId}
            className="rumor-phone__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={config.maxLength}
            rows={3}
            placeholder={copy.placeholder}
            disabled={sending}
            aria-describedby={`${inputId}-count`}
          />
          <div className="rumor-phone__row">
            <span id={`${inputId}-count`} className="rumor-phone__count">
              {left} left · rumor {myRumors.length + 1} of {config.maxPerPerson}
            </span>
            <button type="submit" className="btn-primary rumor-phone__send" disabled={!trimmed || sending}>
              {sending ? 'Whispering…' : copy.submitLabel}
            </button>
          </div>
          {error && <p className="rumor-phone__error" role="alert">{error}</p>}
        </form>
      )}

      {!session.open && <p className="rumor-phone__note">{copy.closedNote}</p>}
      {session.open && nextSlot === undefined && (
        <p className="rumor-phone__note">{copy.outOfRumors}</p>
      )}

      {myRumors.length > 0 && (
        <ol className="rumor-phone__list" aria-live="polite" aria-label="Your rumors">
          {myRumors.map((r) => (
            <li key={r.id} className={`rumor-phone__item rumor-phone__item--${r.status}`}>
              <p className="rumor-phone__text">“…{r.text}”</p>
              {r.verdict ? (
                <VerdictStamp verdict={r.verdict} copy={copy} size="small" />
              ) : (
                <p className="rumor-phone__status">
                  {r.status === 'pending' && copy.pendingLabel}
                  {r.status === 'circulating' && copy.circulatingLabel}
                  {r.status === 'rejected' && copy.rejectedLabel}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
