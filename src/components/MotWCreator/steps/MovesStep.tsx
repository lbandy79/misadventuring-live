import type { MotWMove, MotWPlaybook } from '../../../types/motw.types';

interface MovesStepProps {
  playbook: MotWPlaybook;
  mandatoryMoves: MotWMove[];
  optionalMoves: MotWMove[];
  optionalMoveLimit: number;
  optionalSelectedCount: number;
  selectedMoveNames: string[];
  canAddMove: boolean;
  onToggle: (name: string) => void;
}

export default function MovesStep({
  playbook,
  mandatoryMoves,
  optionalMoves,
  optionalMoveLimit,
  optionalSelectedCount,
  selectedMoveNames,
  canAddMove,
  onToggle,
}: MovesStepProps) {
  return (
    <section className="motw-step">
      <header className="motw-step-header">
        <div className="motw-eyebrow">{playbook.name}</div>
        <h2>Choose Your Moves</h2>
        <p className="motw-step-subtitle">
          {mandatoryMoves.length > 0
            ? `You start with ${mandatoryMoves.length} mandatory move${mandatoryMoves.length > 1 ? 's' : ''}, plus pick ${optionalMoveLimit} from the list below.`
            : `Pick ${optionalMoveLimit} moves from the list below.`}
        </p>
      </header>

      {mandatoryMoves.length > 0 && (
        <div className="motw-moves-section">
          <h3 className="motw-moves-section-label">Mandatory Moves</h3>
          <div className="motw-moves-list">
            {mandatoryMoves.map((move) => (
              <div key={move.name} className="motw-move-card motw-move-mandatory">
                <div className="motw-move-head">
                  <span className="motw-move-name">{move.name}</span>
                  <span className="motw-mandatory-badge">Always</span>
                </div>
                <p className="motw-move-desc">{move.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="motw-moves-section">
        <div className="motw-moves-section-header">
          <h3 className="motw-moves-section-label">Optional Moves</h3>
          <span className={`motw-moves-counter${optionalSelectedCount >= optionalMoveLimit ? ' full' : ''}`}>
            {optionalSelectedCount} / {optionalMoveLimit} chosen
          </span>
        </div>
        <div className="motw-moves-list">
          {optionalMoves.map((move) => {
            const isSelected = selectedMoveNames.includes(move.name);
            const isDisabled = !isSelected && !canAddMove;
            return (
              <button
                key={move.name}
                type="button"
                className={`motw-move-card motw-move-optional${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
                onClick={() => onToggle(move.name)}
                disabled={isDisabled}
              >
                <div className="motw-move-head">
                  <span className="motw-move-check">{isSelected ? '✓' : '○'}</span>
                  <span className="motw-move-name">{move.name}</span>
                </div>
                <p className="motw-move-desc">{move.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
