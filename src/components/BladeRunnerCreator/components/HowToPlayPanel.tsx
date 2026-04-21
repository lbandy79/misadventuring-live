import { useMemo } from 'react';
import type { BladeRunnerSystemConfig } from '../../../types/bladeRunner.types';

interface HowToPlayPanelProps {
  config: BladeRunnerSystemConfig;
  open: boolean;
  onToggle: () => void;
}

const ORDERED_KEYS = [
  'howToRoll',
  'pushing',
  'combat',
  'damageAndStress',
  'investigation',
  'promotionVsHumanity',
] as const;

const TITLES: Record<string, string> = {
  howToRoll: 'How To Roll',
  pushing: 'Pushing',
  combat: 'Combat',
  damageAndStress: 'Damage & Stress',
  investigation: 'Investigation',
  promotionVsHumanity: 'Promotion vs Humanity',
};

export default function HowToPlayPanel({ config, open, onToggle }: HowToPlayPanelProps) {
  const sections = useMemo(
    () => ORDERED_KEYS.filter((key) => Array.isArray(config.quickPlayReference[key])),
    [config.quickPlayReference]
  );

  return (
    <div className={`br-help-panel ${open ? 'open' : ''}`}>
      <button type="button" className="br-help-toggle" onClick={onToggle}>
        {open ? 'Hide How To Play' : 'How To Play'}
      </button>
      {open ? (
        <div className="br-help-content">
          {sections.map((key) => (
            <details key={key} open={key === 'howToRoll'}>
              <summary>{TITLES[key]}</summary>
              <ul>
                {(config.quickPlayReference[key] as string[]).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}
