import DiceRollButton from '../components/DiceRollButton';
import OptionCard from '../components/OptionCard';
import type { BladeRunnerArchetype } from '../hooks/useCharacterCreation';

interface ArchetypeStepProps {
  archetypes: BladeRunnerArchetype[];
  selectedArchetypeId: string | null;
  onSelect: (id: string) => void;
  onRoll: (rolled: number) => void;
}

export default function ArchetypeStep({ archetypes, selectedArchetypeId, onSelect, onRoll }: ArchetypeStepProps) {
  return (
    <section className="br-step">
      <header>
        <h2>Archetype</h2>
        <p>Choose from archetypes allowed by your nature.</p>
      </header>

      <div className="br-row">
        <DiceRollButton dieType="d12" label="Roll Archetype" onResult={onRoll} />
      </div>

      <div className="br-grid">
        {archetypes.map((archetype) => (
          <OptionCard
            key={archetype.id}
            title={archetype.name}
            selected={selectedArchetypeId === archetype.id}
            onClick={() => onSelect(archetype.id)}
            subtitle={`Key Attribute: ${archetype.keyAttribute.toUpperCase()} • Chinyen: ${archetype.chinyenDie}`}
            description={archetype.description}
            footer={
              <div className="br-small-meta">
                <span>Key Skills: {archetype.keySkills.join(', ')}</span>
                <span>Suggested: {archetype.specialties.join(', ')}</span>
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
}
