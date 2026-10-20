import type { WriteInItem } from '@mtp/lib/liveMonster/writeInQueue';

interface Props {
  open: boolean;
  items: WriteInItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Drawer of pinned write-ins, for callbacks later in the show. */
export default function PinnedTray({ open, items, onSelect, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="wis-tray" role="dialog" aria-modal="false" aria-label="Pinned write-ins">
      <div className="wis-tray-head">
        <h2 className="wis-rail-title">★ Pinned for callbacks</h2>
        <button type="button" className="wis-btn wis-btn--small" onClick={onClose}>
          Close <kbd>Esc</kbd>
        </button>
      </div>
      {items.length === 0 ? (
        <p className="wis-rail-empty">Nothing pinned yet. Press Pin on a write-in to save it here.</p>
      ) : (
        <ul className="wis-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className={`wis-item wis-item--${item.status}`} onClick={() => onSelect(item.id)}>
                <span className="wis-item-prompt">{item.revealPrefix}…</span>
                <span className="wis-item-text">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
