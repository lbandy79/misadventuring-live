import DiceRollButton from '../components/DiceRollButton';
import { composeMemorySummary } from '../hooks/useCharacterCreation';
import type { KeyMemoryTables } from '../../../types/bladeRunner.types';

interface KeyMemoryStepProps {
  tables: KeyMemoryTables;
  values: {
    when: string;
    where: string;
    who: string;
    what: string;
    feeling: string;
  };
  onChange: (field: keyof KeyMemoryStepProps['values'], value: string) => void;
  onRoll: (field: keyof KeyMemoryStepProps['values'], rolled: number) => void;
}

function selectOptions(
  field: keyof KeyMemoryStepProps['values'],
  label: string,
  dieType: string,
  options: Array<{ text: string }>,
  value: string,
  onChange: (field: keyof KeyMemoryStepProps['values'], value: string) => void,
  onRoll: (field: keyof KeyMemoryStepProps['values'], rolled: number) => void
) {
  return (
    <div className="br-sub-card">
      <h3>{label}</h3>
      <div className="br-row">
        <DiceRollButton dieType={dieType.toLowerCase()} label="Roll" onResult={(rolled) => onRoll(field, rolled)} />
      </div>
      <select value={value} onChange={(event) => onChange(field, event.target.value)}>
        <option value="">Choose...</option>
        {options.map((option) => (
          <option key={option.text} value={option.text}>{option.text}</option>
        ))}
      </select>
    </div>
  );
}

export default function KeyMemoryStep({ tables, values, onChange, onRoll }: KeyMemoryStepProps) {
  const summary = composeMemorySummary(values);

  return (
    <section className="br-step">
      <header>
        <h2>Key Memory</h2>
        <p>Roll or choose each part of your defining memory.</p>
      </header>

      <div className="br-list">
        {selectOptions('when', 'When', tables.when.rollDie, tables.when.options, values.when, onChange, onRoll)}
        {selectOptions('where', 'Where', tables.where.rollDie, tables.where.options, values.where, onChange, onRoll)}
        {selectOptions('who', 'Who', tables.who.rollDie, tables.who.options, values.who, onChange, onRoll)}
        {selectOptions('what', 'What', tables.what.rollDie, tables.what.options, values.what, onChange, onRoll)}
        {selectOptions('feeling', 'Feeling', tables.feeling.rollDie, tables.feeling.options, values.feeling, onChange, onRoll)}
      </div>

      <div className="br-summary-box">
        <strong>Memory Summary</strong>
        <p>{summary || 'Your memory summary will appear here.'}</p>
      </div>
    </section>
  );
}
