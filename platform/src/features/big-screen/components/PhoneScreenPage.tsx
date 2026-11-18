/**
 * Phone: "On the big screen" at /shows/:showId/screen.
 *
 * Mirrors the projector, live, as a simple scrolling list: the townies the
 * GM marked and the rumors in circulation with their stamps. A backup for
 * venues with no projector (or when it dies), and handy from the back row.
 * Audience and players open the same link.
 *
 * Shows only what is already public on the projector: never pending
 * rumors or the secret cards.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getShow } from '@mtp/lib';
import {
  subscribeToDisplayNpcs,
  subscribeToWorldSelection,
  type NpcProfile,
  type WorldSelection,
} from '@mtp/lib/npcs/npcApi';
import { subscribeToCirculatingRumors, type Rumor } from '@mtp/lib/rumors';
import { NpcCardAvatar, townieLines } from '../../../components/display/NpcDisplayRow';
import { splitByline, useRumorMillForSystem, useRumorMillSession, VerdictStamp } from '../../rumor-mill';
import { resolveBigScreenCopy, type BigScreenCopy } from '../config';
import { screenModeFrom } from '../screenMode';
import '../big-screen.css';

export function PhoneScreenPage() {
  const { showId: slug } = useParams<{ showId: string }>();
  const show = slug ? getShow(slug) : undefined;
  const mill = useRumorMillForSystem(show?.systemId);
  const showId = mill?.showId;
  const session = useRumorMillSession(showId);
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [npcs, setNpcs] = useState<NpcProfile[]>([]);
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const [copy, setCopy] = useState<BigScreenCopy>(resolveBigScreenCopy(undefined));

  useEffect(() => {
    if (!show?.systemId) return;
    let cancelled = false;
    import(`../../../../../src/systems/${show.systemId}.system.json`)
      .then((mod) => {
        if (!cancelled) setCopy(resolveBigScreenCopy((mod.default ?? mod)?.showConfig?.bigScreen));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [show?.systemId]);

  useEffect(() => {
    if (!showId) return;
    const unsubs = [
      subscribeToWorldSelection(showId, setSelection),
      subscribeToDisplayNpcs(showId, setNpcs),
      subscribeToCirculatingRumors(showId, setRumors),
    ];
    return () => unsubs.forEach((u) => u());
  }, [showId]);

  const mode = screenModeFrom(session.boardOn, selection?.displayMode);
  const showTownies = mode === 'townies' || mode === 'both';
  const showRumors = mode === 'rumors' || mode === 'both';
  // Newest revealed first is what people look for; then the rest in order.
  const orderedRumors = useMemo(
    () => [...rumors.filter((r) => r.verdict), ...rumors.filter((r) => !r.verdict)],
    [rumors],
  );

  const accentStyle = show ? ({ '--accent': show.accentColor } as React.CSSProperties) : undefined;

  if (!show) {
    return (
      <section className="page-card">
        <h1>That show doesn't exist.</h1>
        <p>
          <Link to="/">← Home</Link>
        </p>
      </section>
    );
  }

  if (!mill) {
    return (
      <section className="page-card join-page" style={accentStyle}>
        <p className="join-loading">Loading…</p>
      </section>
    );
  }

  return (
    <section className="page-card join-page phone-screen" style={accentStyle} data-show={slug}>
      <header className="join-header">
        <p className="join-eyebrow">{mill.showName}</p>
        <h1 className="join-title">{copy.phoneTitle}</h1>
        <p className="join-subtitle">{copy.phoneSubtitle}</p>
      </header>

      <div aria-live="polite">
        {mode === 'off' && <p className="phone-screen__empty">{copy.phoneOff}</p>}

        {showTownies && (
          <section className="phone-screen__section" aria-labelledby="phone-townies">
            <h2 id="phone-townies" className="phone-screen__heading">
              {copy.townieTitle}
            </h2>
            {npcs.length === 0 ? (
              <p className="phone-screen__empty">Nobody up yet.</p>
            ) : (
              <ol className="phone-screen__list">
                {npcs.map((npc) => {
                  const lines = townieLines(npc);
                  return (
                    <li key={npc.id} className="phone-screen__townie">
                      <NpcCardAvatar seed={npc.avatarSeed ?? npc.displayName ?? ''} size={48} />
                      <div>
                        <p className="phone-screen__name">{lines.name}</p>
                        {lines.role && <p className="phone-screen__role">{lines.role}</p>}
                        {lines.known && <p className="phone-screen__known">{lines.known}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}

        {showRumors && (
          <section className="phone-screen__section" aria-labelledby="phone-rumors">
            <h2 id="phone-rumors" className="phone-screen__heading">
              {mill.config.copy.boardTitle}
            </h2>
            {orderedRumors.length === 0 ? (
              <p className="phone-screen__empty">{mill.config.copy.boardEmpty}</p>
            ) : (
              <ol className="phone-screen__list">
                {orderedRumors.map((r) => {
                  const [name, description] = splitByline(r.npcName);
                  return (
                    <li
                      key={r.id}
                      className={`phone-screen__rumor ${r.verdict ? `phone-screen__rumor--${r.verdict}` : ''}`}
                    >
                      <p className="phone-screen__rumor-name">{name}</p>
                      <p className="phone-screen__rumor-desc">
                        {description ? `${description} ${mill.config.copy.leadIn}` : mill.config.copy.leadIn}
                      </p>
                      <p className="phone-screen__rumor-text">{r.text}</p>
                      {r.verdict && <VerdictStamp verdict={r.verdict} copy={mill.config.copy} size="small" />}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}
      </div>

      <Link to={`/shows/${slug}/join`} className="phone-screen__link">
        ← Back to your townie
      </Link>
    </section>
  );
}
