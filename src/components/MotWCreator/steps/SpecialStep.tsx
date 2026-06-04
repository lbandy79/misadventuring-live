import type { MotWPlaybook, MotWSpecialMechanicsSection } from '../../../types/motw.types';

interface SpecialStepProps {
  playbook: MotWPlaybook;
  specialNotes: string;
  onNotesChange: (notes: string) => void;
  hunterName: string;
  playerName: string;
  onHunterNameChange: (name: string) => void;
  onPlayerNameChange: (name: string) => void;
}

function SectionDisplay({ sectionKey, section }: { sectionKey: string; section: MotWSpecialMechanicsSection }) {
  const label = sectionKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

  return (
    <div className="motw-special-section">
      <h4 className="motw-special-section-title">{label}</h4>
      <p className="motw-special-section-desc">{section.description}</p>

      {section.options && section.options.length > 0 && (
        <div className="motw-special-options">
          {(section.pickCount ?? section.pick) ? (
            <p className="motw-special-pick">
              Pick {section.pickCount ?? section.pick}:
            </p>
          ) : null}
          <ul className="motw-special-list">
            {section.options.map((opt) => <li key={opt}>{opt}</li>)}
          </ul>
        </div>
      )}

      {section.goodTraditions && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Good traditions (pick 2):</p>
            <ul className="motw-special-list">
              {section.goodTraditions.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Bad traditions (pick 1):</p>
            <ul className="motw-special-list motw-list-bad">
              {section.badTraditions?.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
      )}

      {section.resources && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Resources (pick 2):</p>
            <ul className="motw-special-list">
              {section.resources.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Red tape (pick 2):</p>
            <ul className="motw-special-list motw-list-bad">
              {section.redTape?.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      {section.tags && (
        <div className="motw-special-options">
          <p className="motw-special-pick">Pick {section.pick}:</p>
          <ul className="motw-special-tag-list">
            {section.tags.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}

      {section.heroicTags && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Heroic tags (pick 2):</p>
            <ul className="motw-special-list">
              {section.heroicTags.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Doom tags (pick 2):</p>
            <ul className="motw-special-list motw-list-bad">
              {section.doomTags?.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
      )}

      {section.howYouFoundOut && (
        <div className="motw-special-options">
          <p className="motw-special-pick">How did you find out?</p>
          <ul className="motw-special-list">
            {section.howYouFoundOut.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </div>
      )}

      {section.bases && (
        <div className="motw-special-options">
          <p className="motw-special-pick">Bases (pick 1):</p>
          <ul className="motw-special-list">
            {section.bases.map((b) => <li key={b}>{b}</li>)}
          </ul>
          {section.extras && (
            <>
              <p className="motw-special-pick">Extras (optional):</p>
              <ul className="motw-special-list">
                {section.extras.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </>
          )}
          {section.effects && (
            <>
              <p className="motw-special-pick">Effects (pick up to 3):</p>
              <ul className="motw-special-list">
                {section.effects.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {section.suggestions && (
        <div className="motw-special-options">
          <p className="motw-special-pick">Suggestions:</p>
          <ul className="motw-special-list">
            {section.suggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}

      {section.whoYouLost && (
        <div className="motw-special-two-col">
          <div>
            <p className="motw-special-pick">Who you lost:</p>
            <ul className="motw-special-list">
              {section.whoYouLost.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
          <div>
            <p className="motw-special-pick motw-pick-bad">Why you couldn't save them:</p>
            <ul className="motw-special-list motw-list-bad">
              {section.whyYouCouldntSave?.map((w) => <li key={w}>{w}</li>)}
            </ul>
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
  specialNotes,
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
          Name your hunter and review {playbook.name.replace('The ', '')}-specific choices to make before play.
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
            <span className="motw-eyebrow">Reference — make these choices before play</span>
          </div>
          {Object.entries(playbook.specialMechanics!).map(([key, section]) => (
            <SectionDisplay key={key} sectionKey={key} section={section} />
          ))}
        </div>
      ) : (
        <div className="motw-specials-empty">
          <p>No special mechanics for {playbook.name} — just moves, ratings, and gear. Simple and effective.</p>
        </div>
      )}

      <div className="motw-notes-section">
        <label className="motw-field-label">
          Notes (your choices, background, anything else)
          <textarea
            className="motw-textarea"
            value={specialNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Write down your special mechanics choices, character background, gear details, etc."
            rows={5}
          />
        </label>
      </div>
    </section>
  );
}
