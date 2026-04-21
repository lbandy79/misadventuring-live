import DiceRollButton from '../components/DiceRollButton';
import OptionCard from '../components/OptionCard';
import type { BladeRunnerYearsOnForce } from '../hooks/useCharacterCreation';

interface YearsStepProps {
  years: BladeRunnerYearsOnForce[];
  selectedYearsId: string | null;
  isReplicant: boolean;
  onSelect: (id: string) => void;
  onRoll: (rolled: number) => void;
}

export default function YearsStep({ years, selectedYearsId, isReplicant, onSelect, onRoll }: YearsStepProps) {
  return (
    <section className="br-step">
      <header>
        <h2>Years On The Force</h2>
        <p>{isReplicant ? 'Replicants are always Rookie.' : 'Choose or roll on D12.'}</p>
      </header>

      {!isReplicant ? (
        <div className="br-row">
          <DiceRollButton dieType="d12" label="Roll Years" onResult={onRoll} />
        </div>
      ) : null}

      <div className="br-grid">
        {years.map((entry) => {
          const disabled = isReplicant && entry.id !== 'rookie';
          return (
            <OptionCard
              key={entry.id}
              title={entry.name}
              selected={selectedYearsId === entry.id}
              disabled={disabled}
              onClick={() => onSelect(entry.id)}
              subtitle={`${entry.yearsRange} years • Promotion ${entry.promotionDie}`}
              description={entry.description}
              footer={
                <div className="br-small-meta">
                  <span>Attributes +{entry.attributeIncreases}</span>
                  <span>Skills +{entry.skillIncreases}</span>
                  <span>Specialties {entry.specialties}</span>
                </div>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
