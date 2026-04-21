import { useState } from 'react';

interface DiceRollButtonProps {
  dieType: string;
  onResult: (value: number) => void;
  label?: string;
  disabled?: boolean;
}

export default function DiceRollButton({ dieType, onResult, label = 'Roll', disabled = false }: DiceRollButtonProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  const roll = async () => {
    if (disabled || isRolling) return;
    setIsRolling(true);

    const max = Number.parseInt(dieType.toLowerCase().replace('d', ''), 10) || 6;
    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      setPreview(Math.floor(Math.random() * max) + 1);
    }

    const result = Math.floor(Math.random() * max) + 1;
    setPreview(result);
    onResult(result);
    setIsRolling(false);
  };

  return (
    <button type="button" className={`br-roll-btn ${isRolling ? 'rolling' : ''}`} onClick={roll} disabled={disabled || isRolling}>
      <span>{label} {dieType.toUpperCase()}</span>
      <strong>{preview ?? '-'}</strong>
    </button>
  );
}
