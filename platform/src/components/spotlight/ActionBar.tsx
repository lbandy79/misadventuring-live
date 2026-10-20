import type { WriteInItem } from '@mtp/lib/liveMonster/writeInQueue';

interface Props {
  item: WriteInItem | null;
  canPrev: boolean;
  hideArmed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPin: () => void;
  onUsed: () => void;
  onHide: () => void;
}

/**
 * Fixed bottom bar, sized for thumbs. Hide sits at the far left, away from
 * Next, and needs a second tap (or a second H) to fire.
 */
export default function ActionBar({ item, canPrev, hideArmed, onPrev, onNext, onPin, onUsed, onHide }: Props) {
  const disabled = item === null;
  return (
    <nav className="wis-actions" aria-label="Write-in actions">
      <button
        type="button"
        className={`wis-btn wis-btn--hide ${hideArmed ? 'wis-btn--armed' : ''}`}
        disabled={disabled}
        onClick={onHide}
      >
        {hideArmed ? 'Tap again to hide' : 'Hide'} <kbd>H</kbd>
      </button>
      <span className="wis-actions-spacer" />
      <button type="button" className="wis-btn wis-btn--prev" disabled={!canPrev} onClick={onPrev}>
        ◀ Prev <kbd>←</kbd>
      </button>
      <button type="button" className="wis-btn wis-btn--pin" disabled={disabled} aria-pressed={!!item?.pinned} onClick={onPin}>
        {item?.pinned ? '★ Pinned' : '☆ Pin'} <kbd>P</kbd>
      </button>
      <button
        type="button"
        className="wis-btn wis-btn--used"
        disabled={disabled}
        aria-pressed={item?.status === 'used'}
        onClick={onUsed}
      >
        {item?.status === 'used' ? '✓ Used' : 'Mark used'} <kbd>U</kbd>
      </button>
      <button type="button" className="wis-btn wis-btn--next" onClick={onNext}>
        Next ▶ <kbd>→</kbd>
      </button>
    </nav>
  );
}
