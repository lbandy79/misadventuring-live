import { useState } from 'react';
import type { WriteInGroup } from '@mtp/lib/liveMonster/writeInQueue';

interface Props {
  groups: WriteInGroup[];
  slotFilter: string | null;
  onFilter: (slotId: string | null) => void;
  currentId: string | null;
  onSelect: (id: string) => void;
  onUnhide: (id: string) => void;
}

export default function QueueRail({ groups, slotFilter, onFilter, currentId, onSelect, onUnhide }: Props) {
  const [showHidden, setShowHidden] = useState(false);
  const visible = groups.filter((g) => slotFilter === null || g.slotId === slotFilter);
  const hidden = visible.flatMap((g) => g.items.filter((i) => i.status === 'hidden'));
  const pending = groups.reduce((n, g) => n + g.pendingCount, 0);

  return (
    <aside className="wis-rail" aria-label="Write-in queue">
      <div className="wis-rail-head">
        <h2 className="wis-rail-title">
          Queue <span className="wis-count">{pending} pending</span>
        </h2>
        {groups.length > 1 && (
          <div className="wis-chips" role="group" aria-label="Filter by prompt">
            <button
              type="button"
              className="wis-chip"
              aria-pressed={slotFilter === null}
              onClick={() => onFilter(null)}
            >
              All
            </button>
            {groups.map((g) => (
              <button
                key={g.slotId}
                type="button"
                className="wis-chip"
                aria-pressed={slotFilter === g.slotId}
                onClick={() => onFilter(g.slotId)}
              >
                {g.revealPrefix} <span className="wis-chip-count">{g.pendingCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="wis-rail-scroll">
        {visible.length === 0 && <p className="wis-rail-empty">No write-ins yet.</p>}

        {visible.map((g) => {
          const items = g.items.filter((i) => i.status !== 'hidden');
          if (items.length === 0) return null;
          return (
            <section key={g.slotId} className="wis-group" aria-label={g.prompt}>
              <h3 className="wis-group-title">
                {g.prompt} <span className="wis-count">{g.pendingCount}</span>
              </h3>
              <ul className="wis-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`wis-item wis-item--${item.status}`}
                      aria-current={item.id === currentId ? 'true' : undefined}
                      onClick={() => onSelect(item.id)}
                    >
                      <span className="wis-item-text">{item.text}</span>
                      <span className="wis-item-meta">
                        {item.pinned && <span className="wis-tag wis-tag--pinned">★</span>}
                        {item.status === 'used' && <span className="wis-tag wis-tag--used">Used</span>}
                        {item.edited && <span className="wis-tag wis-tag--edited">Edited</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {hidden.length > 0 && (
          <div className="wis-hidden">
            <button
              type="button"
              className="wis-link-btn"
              aria-expanded={showHidden}
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden ? 'Hide' : 'Show'} hidden ({hidden.length})
            </button>
            {showHidden && (
              <ul className="wis-list">
                {hidden.map((item) => (
                  <li key={item.id} className="wis-hidden-row">
                    <span className="wis-item-text wis-item-text--hidden">{item.text}</span>
                    <button type="button" className="wis-btn wis-btn--small" onClick={() => onUnhide(item.id)}>
                      Unhide
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
