/**
 * GM: one picker for what the projector shows (Off / Townies / Rumors /
 * Both), at the top of Show night. Warns before marked townies outgrow the
 * screen. Replaces the separate "board on" and "townies on" switches.
 *
 * Renders nothing for shows without a Rumor Mill.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { setRumorMill } from '@mtp/lib/rumors';
import {
  setWorldSelection,
  subscribeToNpcs,
  subscribeToWorldSelection,
  type NpcProfile,
  type WorldSelection,
} from '@mtp/lib/npcs/npcApi';
import { useRumorMillForSystem, useRumorMillSession } from '../../rumor-mill';
import { SCREEN_MODES, screenModeFrom, writesForMode, type ScreenMode } from '../screenMode';
import { CrowdingWarning } from './CrowdingWarning';
import '../big-screen.css';

const MODE_SENTENCE: Record<ScreenMode, string> = {
  off: 'The projector shows the welcome screen with the QR code.',
  townies: 'The projector shows the townies you marked.',
  rumors: 'The projector shows the Rumor Mill board.',
  both: 'The projector shows your marked townies on the left and the Rumor Mill on the right.',
};

export function ScreenPickerPanel({ showSlug, systemId }: { showSlug: string; systemId: string }) {
  const mill = useRumorMillForSystem(systemId);
  const showId = mill?.showId;
  const session = useRumorMillSession(showId);
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [npcs, setNpcs] = useState<NpcProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showId) return;
    const unsubSel = subscribeToWorldSelection(showId, setSelection);
    const unsubNpcs = subscribeToNpcs(showId, setNpcs);
    return () => {
      unsubSel();
      unsubNpcs();
    };
  }, [showId]);

  if (!mill || !showId) return null;

  const mode = screenModeFrom(session.boardOn, selection?.displayMode);
  const marked = npcs.filter((n) => n.showOnDisplay).length;

  async function choose(next: ScreenMode) {
    if (!showId || next === mode || busy) return;
    setBusy(true);
    setError(null);
    try {
      const w = writesForMode(next);
      await Promise.all([
        setRumorMill(showId, { boardOn: w.boardOn }),
        setWorldSelection(showId, { displayMode: w.displayMode }),
      ]);
    } catch (err) {
      console.error('screen picker failed:', err);
      setError("The screen didn't switch. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen-picker" aria-labelledby="screen-picker-title">
      <h2 id="screen-picker-title" className="screen-picker__title">
        Big screen · {mill.showName}
      </h2>
      <div className="screen-picker__modes" role="group" aria-label="What the projector shows">
        {SCREEN_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`screen-picker__mode ${mode === m.id ? 'screen-picker__mode--on' : ''}`}
            aria-pressed={mode === m.id}
            disabled={busy}
            onClick={() => choose(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="screen-picker__now" aria-live="polite">
        {MODE_SENTENCE[mode]} {marked} townie{marked === 1 ? '' : 's'} marked.
      </p>
      <CrowdingWarning mode={mode} marked={marked} />
      {error && (
        <p className="screen-warning screen-warning--over" role="alert">
          {error}
        </p>
      )}
      <p className="screen-picker__links">
        <Link to={`/shows/${showSlug}/display`} target="_blank" rel="noreferrer">
          Open projector view ↗
        </Link>
        <Link to={`/shows/${showSlug}/screen`} target="_blank" rel="noreferrer">
          Open phone view ↗
        </Link>
      </p>
    </section>
  );
}
