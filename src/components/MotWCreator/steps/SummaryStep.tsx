import type { MotWCreatorState, MotWMove, MotWPlaybook, MotWRating, MotWRatingsLine, MotWSystemConfig } from '../../../types/motw.types';
import type { MotWStep } from '../../../types/motw.types';

interface SummaryStepProps {
  state: MotWCreatorState;
  playbook: MotWPlaybook;
  selectedRatings: MotWRatingsLine;
  mandatoryMoves: MotWMove[];
  config: MotWSystemConfig;
  onJumpToStep: (step: MotWStep) => void;
  onReset: () => void;
}

function formatRating(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

function LuckTrack({ boxes }: { boxes: number }) {
  return (
    <div className="motw-luck-track">
      {Array.from({ length: boxes }, (_, i) => (
        <span key={i} className="motw-luck-box" />
      ))}
    </div>
  );
}

function HarmTrack({ track, unstableAt }: { track: number; unstableAt: number }) {
  return (
    <div className="motw-harm-track">
      {Array.from({ length: track }, (_, i) => (
        <span key={i} className={`motw-harm-box${i >= unstableAt - 1 ? ' unstable' : ''}`} />
      ))}
      <span className="motw-harm-label-dead">✝</span>
    </div>
  );
}

export default function SummaryStep({
  state,
  playbook,
  selectedRatings,
  mandatoryMoves,
  config,
  onJumpToStep,
  onReset,
}: SummaryStepProps) {
  const allSelectedMoves = [
    ...mandatoryMoves,
    ...playbook.moves.filter((m) => !m.mandatory && state.selectedMoveNames.includes(m.name)),
  ];

  const ratings = config.ratings.list;

  return (
    <section className="motw-step motw-summary">
      <header className="motw-step-header">
        <div className="motw-eyebrow">Character Sheet</div>
        <h2>{state.hunterName || 'Unnamed Hunter'}</h2>
        {state.playerName && <p className="motw-player-name">Player: {state.playerName}</p>}
        <p className="motw-playbook-tag">{playbook.name}</p>
      </header>

      <div className="motw-sheet-grid">

        <div className="motw-sheet-section">
          <div className="motw-sheet-section-head">
            <h3>Ratings</h3>
            <button type="button" className="motw-jump-btn" onClick={() => onJumpToStep('ratings')}>Edit</button>
          </div>
          <div className="motw-sheet-ratings">
            {ratings.map((r: MotWRating) => {
              const val = selectedRatings[r.id];
              return (
                <div key={r.id} className={`motw-sheet-stat${val >= 2 ? ' high' : val <= -1 ? ' low' : ''}`}>
                  <span className="motw-sheet-stat-name">{r.name}</span>
                  <span className="motw-sheet-stat-val">{formatRating(val)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="motw-sheet-section">
          <h3>Luck</h3>
          <LuckTrack boxes={config.luck.boxes} />
          {playbook.luckSpecial && (
            <p className="motw-sheet-luck-special">{playbook.luckSpecial}</p>
          )}
        </div>

        <div className="motw-sheet-section">
          <h3>Harm</h3>
          <HarmTrack track={config.harm.track} unstableAt={config.harm.unstableAt} />
          <p className="motw-sheet-harm-note">Unstable at {config.harm.unstableAt}+</p>
        </div>

        <div className="motw-sheet-section motw-sheet-wide">
          <div className="motw-sheet-section-head">
            <h3>Moves</h3>
            <button type="button" className="motw-jump-btn" onClick={() => onJumpToStep('moves')}>Edit</button>
          </div>
          <div className="motw-sheet-moves">
            {allSelectedMoves.map((move) => (
              <div key={move.name} className={`motw-sheet-move${move.mandatory ? ' mandatory' : ''}`}>
                <div className="motw-sheet-move-name">
                  {move.name}
                  {move.mandatory ? <span className="motw-mandatory-badge">Always</span> : null}
                </div>
                <p className="motw-sheet-move-desc">{move.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="motw-sheet-section">
          <h3>Gear</h3>
          <ul className="motw-sheet-gear">
            {playbook.gear.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>

        {state.specialNotes && (
          <div className="motw-sheet-section motw-sheet-wide">
            <div className="motw-sheet-section-head">
              <h3>Special Mechanics & Notes</h3>
              <button type="button" className="motw-jump-btn" onClick={() => onJumpToStep('specials')}>Edit</button>
            </div>
            <p className="motw-sheet-notes">{state.specialNotes}</p>
          </div>
        )}

        <div className="motw-sheet-section motw-sheet-wide">
          <h3>Experience</h3>
          <div className="motw-xp-track">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="motw-xp-box" />
            ))}
          </div>
          <p className="motw-sheet-harm-note">Mark on a miss (6−) or when a move says to. 5 marks = level up.</p>
        </div>

      </div>

      <div className="motw-sheet-section motw-sheet-wide motw-reference-section">
        <h3>Basic Moves Quick Reference</h3>
        <div className="motw-basic-moves-grid">
          {config.basicMoves.map((move) => (
            <div key={move.id} className="motw-basic-move-card">
              <div className="motw-basic-move-head">
                <span className="motw-basic-move-name">{move.name}</span>
                <span className="motw-basic-move-roll">+{move.roll}</span>
              </div>
              <p className="motw-basic-move-trigger">{move.trigger}</p>
              <ul className="motw-basic-move-results">
                {Object.entries(move.results).map(([key, val]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {val}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="motw-summary-actions">
        <button type="button" className="motw-btn-secondary" onClick={onReset}>
          Start Over
        </button>
        <button type="button" className="motw-btn-primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
    </section>
  );
}
