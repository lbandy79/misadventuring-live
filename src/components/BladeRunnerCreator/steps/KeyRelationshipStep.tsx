import DiceRollButton from '../components/DiceRollButton';
import type { KeyRelationshipTables } from '../../../types/bladeRunner.types';

interface KeyRelationshipStepProps {
  tables: KeyRelationshipTables;
  values: {
    name: string;
    who: string;
    quality: string;
    situation: string;
  };
  onChange: (field: keyof KeyRelationshipStepProps['values'], value: string) => void;
  onRoll: (field: 'who' | 'quality' | 'situation', rolled: number) => void;
}

function chooser(
  field: 'who' | 'quality' | 'situation',
  label: string,
  dieType: string,
  options: Array<{ text: string }>,
  value: string,
  onChange: (field: keyof KeyRelationshipStepProps['values'], value: string) => void,
  onRoll: (field: 'who' | 'quality' | 'situation', rolled: number) => void
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

export default function KeyRelationshipStep({ tables, values, onChange, onRoll }: KeyRelationshipStepProps) {
  const summary = values.name && values.who && values.quality && values.situation
    ? `${values.name} is your ${values.who}. Relationship: ${values.quality}. Situation: ${values.situation}`
    : '';

  return (
    <section className="br-step">
      <header>
        <h2>Key Relationship</h2>
        <p>Roll or choose who this person is, and define your current tension.</p>
      </header>

      <div className="br-sub-card">
        <h3>Name</h3>
        <input value={values.name} onChange={(event) => onChange('name', event.target.value)} placeholder="NPC name" maxLength={60} />
      </div>

      <div className="br-list">
        {chooser('who', 'Who', tables.who.rollDie, tables.who.options, values.who, onChange, onRoll)}
        {chooser('quality', 'Quality', tables.quality.rollDie, tables.quality.options, values.quality, onChange, onRoll)}
        {chooser('situation', 'Situation', tables.situation.rollDie, tables.situation.options, values.situation, onChange, onRoll)}
      </div>

      <div className="br-summary-box">
        <strong>Relationship Summary</strong>
        <p>{summary || 'Your relationship summary will appear here.'}</p>
      </div>
    </section>
  );
}
