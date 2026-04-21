import DiceRollButton from '../components/DiceRollButton';
import OptionCard from '../components/OptionCard';
import type { BladeRunnerNatureOption } from '../hooks/useCharacterCreation';

interface NatureStepProps {
  natures: BladeRunnerNatureOption[];
  selectedNatureId: 'human' | 'replicant' | null;
  onSelect: (natureId: 'human' | 'replicant') => void;
  onRoll: (rolled: number) => void;
}

export default function NatureStep({ natures, selectedNatureId, onSelect, onRoll }: NatureStepProps) {
  return (
    <section className="br-step">
      <header>
        <h2>Nature</h2>
        <p>Choose or roll for Human vs Replicant. This determines push rules and archetype availability.</p>
      </header>

      <div className="br-row">
        <DiceRollButton dieType="d6" label="Roll Nature" onResult={onRoll} />
      </div>

      <div className="br-grid">
        {natures.map((nature) => (
          <OptionCard
            key={nature.id}
            title={nature.name}
            selected={selectedNatureId === nature.id}
            onClick={() => onSelect(nature.id)}
            subtitle={`Push ${nature.pushLimit}x • Health ${nature.healthModifier >= 0 ? '+' : ''}${nature.healthModifier} • Resolve ${nature.resolveModifier >= 0 ? '+' : ''}${nature.resolveModifier}`}
            description={nature.notes}
            footer={
              <div className="br-small-meta">
                <span>Promotion {nature.promotionModifier >= 0 ? '+' : ''}{nature.promotionModifier}</span>
                <span>Chinyen {nature.chinyenModifier >= 0 ? '+' : ''}{nature.chinyenModifier}</span>
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
}
