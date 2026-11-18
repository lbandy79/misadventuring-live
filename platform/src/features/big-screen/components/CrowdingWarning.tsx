import { townieCrowding, type ScreenMode } from '../screenMode';
import '../big-screen.css';

/** The "about to squish" line, shown in the picker and the Townies panel. */
export function CrowdingWarning({ mode, marked }: { mode: ScreenMode; marked: number }) {
  const c = townieCrowding(mode, marked);
  if (c.level === 'ok') return null;
  return (
    <p className={`screen-warning screen-warning--${c.level}`} role="status">
      <span className="screen-warning__icon" aria-hidden="true">
        {c.level === 'over' ? '⚠' : 'ℹ'}
      </span>
      {c.message}
    </p>
  );
}
