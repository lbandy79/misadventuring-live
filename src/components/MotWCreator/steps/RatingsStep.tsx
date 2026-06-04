import type { MotWPlaybook, MotWRating, MotWRatingsLine } from '../../../types/motw.types';

interface RatingsStepProps {
  playbook: MotWPlaybook;
  ratings: MotWRating[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function formatRating(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

function ratingColor(val: number): string {
  if (val >= 2) return 'motw-stat-high';
  if (val <= -1) return 'motw-stat-low';
  return '';
}

function RatingsLineDisplay({ line, ratings }: { line: MotWRatingsLine; ratings: MotWRating[] }) {
  return (
    <div className="motw-ratings-line">
      {ratings.map((r) => {
        const val = line[r.id];
        return (
          <div key={r.id} className={`motw-stat-block ${ratingColor(val)}`}>
            <span className="motw-stat-name">{r.name}</span>
            <span className="motw-stat-value">{formatRating(val)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RatingsStep({ playbook, ratings, selectedIndex, onSelect }: RatingsStepProps) {
  return (
    <section className="motw-step">
      <header className="motw-step-header">
        <div className="motw-eyebrow">{playbook.name}</div>
        <h2>Choose Your Ratings</h2>
        <p className="motw-step-subtitle">
          Pick the stat spread that fits how you want to play. Each line is pre-balanced — there are no wrong answers.
        </p>
      </header>

      <div className="motw-ratings-options">
        {playbook.ratingLines.map((line, i) => (
          <button
            key={i}
            type="button"
            className={`motw-ratings-option${selectedIndex === i ? ' selected' : ''}`}
            onClick={() => onSelect(i)}
          >
            <div className="motw-ratings-option-label">Option {i + 1}</div>
            <RatingsLineDisplay line={line} ratings={ratings} />
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <div className="motw-ratings-guide">
          <h4>Rating Scale</h4>
          <div className="motw-scale-row">
            <span className="motw-stat-low">−1 Bad</span>
            <span>0 Average</span>
            <span>+1 Good</span>
            <span className="motw-stat-high">+2 Really good</span>
            <span className="motw-stat-high">+3 Phenomenal</span>
          </div>
          <div className="motw-ratings-desc-list">
            {ratings.map((r) => (
              <div key={r.id} className="motw-ratings-desc-row">
                <strong>{r.name}</strong> — {r.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
