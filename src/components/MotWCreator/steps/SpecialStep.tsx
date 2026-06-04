import type { MotWPlaybook, MotWSpecialMechanicsSection } from '../../../types/motw.types';

interface SpecialStepProps {
  playbook: MotWPlaybook;
  specialSelections: Record<string, string[]>;
  specialNotes: string;
  onToggle: (key: string, item: string, limit: number) => void;
  onNotesChange: (notes: string) => void;
  hunterName: string;
  playerName: string;
  onHunterNameChange: (name: string) => void;
  onPlayerNameChange: (name: string) => void;
}

interface SelectableListProps {
  items: string[];
  selectionKey: string;
  limit: number;
  selected: string[];
  onToggle: (key: string, item: string, limit: number) => void;
  variant?: 'normal' | 'bad';
  showCount?: boolean;
}

function SelectableList({ items, selectionKey, limit, selected, onToggle, variant = 'normal', showCount }: SelectableListProps) {
  return (
    <div>
      {showCount && (
        <span className={`motw-sel-count${selected.length >= limit ? ' full' : ''}`}>
          {selected.length} / {limit} selected
        </span>
      )}
      <ul className={`motw-special-list${variant === 'bad' ? ' motw-list-bad' : ''} motw-selectable-list`}>
        {items.map((item) => {
          const isSelected = selected.includes(item);
          const isDisabled = !isSelected && selected.length >= limit && limit > 1;
          return (
            <li key={item}>
              <button
                type="button"
                className={`motw-special-item${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
                onClick={() => onToggle(selectionKey, item, limit)}
                disabled={isDisabled}
              >
                {isSelected ? '✓ ' : ''}{item}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SectionDisplayProps {
  sectionKey: string;
  section: MotWSpecialMechanicsSection;
  selections: Record<string, string[]>;
  onToggle: (key: string, item: string, limit: number) => void;
}

function SectionDisplay({ sectionKey, section, selections, onToggle }: SectionDisplayProps) {
  const label = sectionKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

  const sel = (field: string) => selections[`${sectionKey}.${field}`] ?? [];
  const tog = (field: string, item: string, limit: number) => onToggle(`${sectionKey}.${field}`, item, limit);

  return (
    <div className="motw-special-section">
      <h4 className="motw-special-section-title">{label}</h4>
      <p className="motw-special-section-desc">{section.description}</p>

      {section.options && section.options.length > 0 && (
        <div className="motw-special-options">
          <p className="motw-special-pick">
            Pick {section.pickCount ?? section.pick ?? 1}:
          </p>
          <SelectableList
            items={section.options}
            selectionKey={`${sectionKey}.options`}
            limit={section.pickCount ?? section.pick ?? 1}
            selected={sel('options')}
            onToggle={onToggle}
            showCount={(section.pickCount ?? section.pick ?? 1) > 1}
          />
        </div>
      )}

      {section.goodTraditions && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Good traditions (pick 2):</p>
            <SelectableList items={section.goodTraditions} selectionKey={`${sectionKey}.goodTraditions`} limit={2} selected={sel('goodTraditions')} onToggle={onToggle} showCount />
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Bad traditions (pick 1):</p>
            <SelectableList items={section.badTraditions ?? []} selectionKey={`${sectionKey}.badTraditions`} limit={1} selected={sel('badTraditions')} onToggle={onToggle} variant="bad" />
          </div>
        </div>
      )}

      {section.resources && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Resources (pick 2):</p>
            <SelectableList items={section.resources} selectionKey={`${sectionKey}.resources`} limit={2} selected={sel('resources')} onToggle={onToggle} showCount />
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Red tape (pick 2):</p>
            <SelectableList items={section.redTape ?? []} selectionKey={`${sectionKey}.redTape`} limit={2} selected={sel('redTape')} onToggle={onToggle} variant="bad" showCount />
          </div>
        </div>
      )}

      {section.tags && (
        <div className="motw-special-options">
          <p className="motw-special-pick">Pick {section.pick}:</p>
          <SelectableList items={section.tags} selectionKey={`${sectionKey}.tags`} limit={section.pick ?? 3} selected={sel('tags')} onToggle={onToggle} showCount />
        </div>
      )}

      {section.heroicTags && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Heroic tags (pick 2):</p>
            <SelectableList items={section.heroicTags} selectionKey={`${sectionKey}.heroicTags`} limit={2} selected={sel('heroicTags')} onToggle={onToggle} showCount />
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Doom tags (pick 2):</p>
            <SelectableList items={section.doomTags ?? []} selectionKey={`${sectionKey}.doomTags`} limit={2} selected={sel('doomTags')} onToggle={onToggle} variant="bad" showCount />
          </div>
        </div>
      )}

      {section.howYouFoundOut && (
        <div className="motw-special-options">
          <p className="motw-special-pick">How did you find out? (pick 1)</p>
          <SelectableList items={section.howYouFoundOut} selectionKey={`${sectionKey}.howYouFoundOut`} limit={1} selected={sel('howYouFoundOut')} onToggle={onToggle} />
        </div>
      )}

      {section.suggestions && (
        <div className="motw-special-options">
          <p className="motw-special-pick">Pick one:</p>
          <SelectableList items={section.suggestions} selectionKey={`${sectionKey}.suggestions`} limit={1} selected={sel('suggestions')} onToggle={onToggle} />
        </div>
      )}

      {section.bases && (
        <div className="motw-special-options">
          <p className="motw-special-pick">Base (pick 1):</p>
          <SelectableList items={section.bases} selectionKey={`${sectionKey}.bases`} limit={1} selected={sel('bases')} onToggle={onToggle} />
          {section.extras && (
            <>
              <p className="motw-special-pick" style={{ marginTop: '0.5rem' }}>Extras (pick any):</p>
              <SelectableList items={section.extras} selectionKey={`${sectionKey}.extras`} limit={section.extras.length} selected={sel('extras')} onToggle={onToggle} />
            </>
          )}
          {section.effects && (
            <>
              <p className="motw-special-pick" style={{ marginTop: '0.5rem' }}>Effects (pick up to 3):</p>
              <SelectableList items={section.effects} selectionKey={`${sectionKey}.effects`} limit={3} selected={sel('effects')} onToggle={onToggle} showCount />
            </>
          )}
        </div>
      )}

      {section.whoYouLost && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Who you lost (pick 1):</p>
            <SelectableList items={section.whoYouLost} selectionKey={`${sectionKey}.whoYouLost`} limit={1} selected={sel('whoYouLost')} onToggle={onToggle} />
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Why you couldn't save them (pick 1):</p>
            <SelectableList items={section.whyYouCouldntSave ?? []} selectionKey={`${sectionKey}.whyYouCouldntSave`} limit={1} selected={sel('whyYouCouldntSave')} onToggle={onToggle} variant="bad" />
          </div>
        </div>
      )}

      {section.prey && (
        <p className="motw-special-prey">{section.prey}</p>
      )}
    </div>
  );
}

export default function SpecialStep({
  playbook,
  specialSelections,
  specialNotes,
  onToggle,
  onNotesChange,
  hunterName,
  playerName,
  onHunterNameChange,
  onPlayerNameChange,
}: SpecialStepProps) {
  const hasSpecials = playbook.specialMechanics && Object.keys(playbook.specialMechanics).length > 0;

  return (
    <section className="motw-step">
      <header className="motw-step-header">
        <div className="motw-eyebrow">{playbook.name}</div>
        <h2>Details & Special Mechanics</h2>
        <p className="motw-step-subtitle">
          Name your hunter and make {playbook.name.replace('The ', '')}-specific choices before play.
        </p>
      </header>

      <div className="motw-details-fields">
        <label className="motw-field-label">
          Hunter Name
          <input
            type="text"
            className="motw-text-input"
            value={hunterName}
            onChange={(e) => onHunterNameChange(e.target.value)}
            placeholder="What do they call you?"
          />
        </label>
        <label className="motw-field-label">
          Player Name
          <input
            type="text"
            className="motw-text-input"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Your name at the table"
          />
        </label>
      </div>

      {hasSpecials ? (
        <div className="motw-specials-wrap">
          <div className="motw-specials-header">
            <span className="motw-eyebrow">Make your choices below</span>
          </div>
          {Object.entries(playbook.specialMechanics!).map(([key, section]) => (
            <SectionDisplay
              key={key}
              sectionKey={key}
              section={section}
              selections={specialSelections}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="motw-specials-empty">
          <p>No special mechanics for {playbook.name} — just moves, ratings, and gear.</p>
        </div>
      )}

      <div className="motw-notes-section">
        <label className="motw-field-label">
          Additional Notes
          <textarea
            className="motw-textarea"
            value={specialNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Anything else — character background, gear details, prey name, etc."
            rows={4}
          />
        </label>
      </div>
    </section>
  );
}
