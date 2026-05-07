import type { BladeRunnerSpecialty } from '../../../types/bladeRunner.types';
import type { BladeRunnerArchetype } from '../hooks/useCharacterCreation';

interface SpecialtiesStepProps {
  specialties: BladeRunnerSpecialty[];
  selected: string[];
  selectedById: Record<string, number>;
  limit: number;
  selectedArchetype: BladeRunnerArchetype | null;
  canAdd: (id: string) => boolean;
  onChange: (next: string[]) => void;
}

export default function SpecialtiesStep({
  specialties,
  selected,
  selectedById,
  limit,
  selectedArchetype,
  canAdd,
  onChange,
}: SpecialtiesStepProps) {
  const suggested = new Set(selectedArchetype?.specialties ?? []);

  const removeOne = (id: string) => {
    const index = selected.findIndex((entry) => entry === id);
    if (index < 0) return;
    const next = [...selected];
    next.splice(index, 1);
    onChange(next);
  };

  const addOne = (id: string) => {
    if (!canAdd(id)) return;
    onChange([...selected, id]);
  };

  return (
    <section className="br-step">
      <header>
        <h2>Specialties</h2>
        <p>Pick specialties up to your Years on the Force limit.</p>
      </header>

      <div className="br-budget-row">
        <strong>Selected: {selected.length}/{limit}</strong>
      </div>

      <div className="br-list">
        {specialties.map((specialty) => {
          const count = selectedById[specialty.id] ?? 0;
          return (
            <div key={specialty.id} className={`br-list-item ${suggested.has(specialty.id) ? 'key' : ''}`}>
              <div>
                <h3>
                  {specialty.name}
                  {suggested.has(specialty.id) ? <span className="br-inline-badge">Suggested</span> : null}
                </h3>
                <p>{specialty.description}</p>
                <small>Selected: {count}</small>
              </div>
              <div className="br-stepper">
                <button type="button" onClick={() => removeOne(specialty.id)} disabled={count === 0}>-</button>
                <button type="button" onClick={() => addOne(specialty.id)} disabled={!canAdd(specialty.id)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
