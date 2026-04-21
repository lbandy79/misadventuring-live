import type { AttributeLevel } from '../../../types/bladeRunner.types';

interface StatPickerProps {
  value: AttributeLevel;
  onChange: (value: AttributeLevel) => void;
  disabled?: boolean;
}

const LEVELS: Array<{ level: AttributeLevel; die: string; label: string }> = [
  { level: 'D', die: 'D6', label: 'Feeble' },
  { level: 'C', die: 'D8', label: 'Average' },
  { level: 'B', die: 'D10', label: 'Capable' },
  { level: 'A', die: 'D12', label: 'Extraordinary' },
];

export default function StatPicker({ value, onChange, disabled = false }: StatPickerProps) {
  return (
    <div className="br-stat-picker" role="group" aria-label="Rank selector">
      {LEVELS.map((item) => (
        <button
          key={item.level}
          type="button"
          className={value === item.level ? 'active' : ''}
          onClick={() => onChange(item.level)}
          disabled={disabled}
          aria-pressed={value === item.level}
          aria-label={`${item.label}, rank ${item.level}, ${item.die}`}
          title={`${item.label} (${item.die})`}
        >
          <span className="br-stat-letter">{item.level}</span>
          <span className="br-stat-die">{item.die}</span>
        </button>
      ))}
    </div>
  );
}

