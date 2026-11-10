/**
 * Projector view: rumors in circulation as notes pinned to a board.
 *
 * Shows at most `config.boardPageSize` notes at once (8 by default: two rows
 * of four, the same density where the MotW NPC row starts to squish). More
 * than that and the board turns pages on a timer instead of shrinking the
 * type. The grid and type size step down with the number of notes on the
 * page, and long rumors get slightly smaller type than short ones.
 *
 * No verdict is shown until the GM reveals one; the secret draw never
 * reaches this component.
 */

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeToCirculatingRumors, type Rumor } from '@mtp/lib/rumors';
import type { RumorMillConfig } from '../config';
import { VerdictStamp } from './VerdictStamp';
import '../rumor-mill.css';

interface Props {
  /** Firestore episode id. Ignored when `demoRumors` is given. */
  showId: string;
  config: RumorMillConfig;
  /** Whether phones can send right now: shows the "scan to start one" QR. */
  open: boolean;
  joinUrl: string;
  /** Layout preview: render these instead of subscribing to Firestore. */
  demoRumors?: Rumor[];
}

function lengthBucket(text: string): 'short' | 'medium' | 'long' | 'xlong' {
  if (text.length <= 50) return 'short';
  if (text.length <= 90) return 'medium';
  if (text.length <= 115) return 'long';
  return 'xlong';
}

/**
 * Split a byline into the townie's name and the rest, so the name can be
 * set big. "Dolores, the very sweaty bingo caller" → ["Dolores", "the very
 * sweaty bingo caller"]. A byline with no comma is all name.
 */
export function splitByline(byline: string): [name: string, description: string] {
  const i = byline.indexOf(',');
  if (i === -1) return [byline.trim(), ''];
  return [byline.slice(0, i).trim(), byline.slice(i + 1).trim()];
}

export function RumorBoard({ showId, config, open, joinUrl, demoRumors }: Props) {
  const { copy } = config;
  const [liveRumors, setLiveRumors] = useState<Rumor[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (demoRumors) return;
    return subscribeToCirculatingRumors(showId, setLiveRumors, (err) =>
      console.error('rumor board listener failed:', err),
    );
  }, [showId, demoRumors]);

  const rumors = demoRumors ?? liveRumors;
  const pageCount = Math.max(1, Math.ceil(rumors.length / config.boardPageSize));
  const current = Math.min(page, pageCount - 1);

  // Turn the page on a timer when there is more than one.
  useEffect(() => {
    if (pageCount <= 1) return;
    const id = window.setInterval(
      () => setPage((p) => (p + 1) % pageCount),
      config.boardPageSeconds * 1000,
    );
    return () => window.clearInterval(id);
  }, [pageCount, config.boardPageSeconds]);

  const visible = useMemo(
    () => rumors.slice(current * config.boardPageSize, (current + 1) * config.boardPageSize),
    [rumors, current, config.boardPageSize],
  );

  return (
    <div className="rumor-board">
      <header className="rumor-board__header">
        <div>
          <p className="madlibs-display-eyebrow">{copy.boardSubtitle}</p>
          <h1 className="rumor-board__title">{copy.boardTitle}</h1>
        </div>
        <div className="rumor-board__aside">
          {pageCount > 1 && (
            <p className="rumor-board__pages" aria-label={`Page ${current + 1} of ${pageCount}`}>
              {Array.from({ length: pageCount }, (_, i) => (
                <span key={i} className={i === current ? 'rumor-board__dot rumor-board__dot--on' : 'rumor-board__dot'} />
              ))}
              <span className="rumor-board__count">{rumors.length} rumors</span>
            </p>
          )}
          {open && (
            <div className="rumor-board__qr">
              <QRCodeSVG value={joinUrl} size={96} bgColor="transparent" fgColor="#1c1c1c" />
              <p>Heard something?<br />Scan to start a rumor.</p>
            </div>
          )}
        </div>
      </header>

      {rumors.length === 0 ? (
        <p className="rumor-board__empty">{copy.boardEmpty}</p>
      ) : (
        <ol
          key={current}
          className="rumor-board__grid"
          data-count={visible.length}
          aria-live="polite"
          aria-label="Rumors going around town"
        >
          {visible.map((r, i) => {
            const [name, description] = splitByline(r.npcName);
            return (
              <li
                key={r.id}
                className={`rumor-note rumor-note--${lengthBucket(r.text)} ${r.verdict ? `rumor-note--${r.verdict}` : ''}`}
                data-tilt={i % 4}
              >
                <p className="rumor-note__byline">
                  <span className="rumor-note__name">{name}</span>
                  <span className="rumor-note__desc">
                    {description ? `${description} ${copy.leadIn}` : copy.leadIn}
                  </span>
                </p>
                <p className="rumor-note__text">{r.text}</p>
                {r.verdict && <VerdictStamp verdict={r.verdict} copy={copy} />}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
