import type { ReactNode } from 'react';
import type { Maturity, PlaytestFlag } from '@mtp/lib';
import { ContentFlagBadges } from './ContentFlags';
import { ArtThumb } from './art/Art';

/** One pickable thing (species, background, class, archetype…). */
export function OptionCard({
  name, detail, selected, onSelect, playtest, maturity, note, artId, children,
}: {
  name: string;
  detail?: string;
  selected: boolean;
  onSelect: () => void;
  playtest?: PlaytestFlag;
  maturity?: Maturity;
  /** Short informational line, e.g. the name-collision note. */
  note?: string;
  /** Entity id whose draft art to show on the card, if any exists. */
  artId?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`type-card sbp-option ${selected ? 'type-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {artId && <ArtThumb entityId={artId} alt="" className="sbp-option__art" />}
      <span className="type-card-id sbp-option__name">
        {name}
        <ContentFlagBadges playtest={playtest} maturity={maturity} />
      </span>
      {detail && <span className="type-card-motivation">{detail}</span>}
      {note && <span className="sbp-option__note">{note}</span>}
      {children}
    </button>
  );
}
