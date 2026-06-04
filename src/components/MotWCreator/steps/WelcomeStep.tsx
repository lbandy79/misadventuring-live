import type { MotWSystemConfig } from '../../../types/motw.types';

interface WelcomeStepProps {
  config: MotWSystemConfig;
}

export default function WelcomeStep({ config }: WelcomeStepProps) {
  const results = config.dice.mechanic.results;

  return (
    <section className="motw-step">
      <header className="motw-step-header">
        <div className="motw-eyebrow">Hunter Briefing</div>
        <h2>{config.system.name}</h2>
        <p className="motw-step-subtitle">{config.system.description}</p>
      </header>

      <div className="motw-welcome-grid">
        <div className="motw-rules-card">
          <h3>How Dice Work</h3>
          <p className="motw-rules-intro">
            When you do something risky, roll <strong>2d6</strong> and add the relevant rating.
          </p>
          <ul className="motw-result-list">
            {Object.entries(results).map(([key, value]) => (
              <li key={key} className={`motw-result motw-result-${key.replace('+', 'plus').replace('-', 'minus')}`}>
                <span className="motw-result-range">{key}</span>
                <span className="motw-result-text">{value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="motw-rules-card">
          <h3>Ratings</h3>
          <p className="motw-rules-intro">Scale from −1 (bad) to +3 (phenomenal).</p>
          <ul className="motw-rating-list">
            {config.ratings.list.map((r) => (
              <li key={r.id} className="motw-rating-entry">
                <span className="motw-rating-name">{r.name}</span>
                <span className="motw-rating-desc">{r.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="motw-rules-card">
          <h3>Luck & Harm</h3>
          <div className="motw-luck-harm">
            <div>
              <span className="motw-rules-label">Luck</span>
              <p>
                Start with {config.luck.boxes} Luck boxes. Spend one to change any roll to a 12,
                or to reduce a wound to 0. When empty, you're doomed.
              </p>
            </div>
            <div>
              <span className="motw-rules-label">Harm</span>
              <p>
                Track harm on a {config.harm.track}-box scale. At {config.harm.unstableAt}+ harm
                you're unstable and worsen without treatment. At 8 harm you're dead.
              </p>
            </div>
          </div>
        </div>

        <div className="motw-rules-card">
          <h3>Experience & Leveling</h3>
          <p>{config.improvements.leveling}</p>
          <p className="motw-rules-small">After 5 level-ups, advanced improvements unlock.</p>
        </div>
      </div>

      <div className="motw-welcome-cta">
        <p>Ready to build your hunter? Hit Next to choose your playbook.</p>
      </div>
    </section>
  );
}
