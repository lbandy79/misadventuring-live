import type { BladeRunnerStep } from '../hooks/useCharacterCreation';

interface ProgressBarProps {
  currentStep: BladeRunnerStep;
  steps: BladeRunnerStep[];
  labels: Record<BladeRunnerStep, string>;
}

export default function ProgressBar({ currentStep, steps, labels }: ProgressBarProps) {
  const currentIndex = steps.indexOf(currentStep);
  const percent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="br-progress-wrap">
      <div className="br-progress-track">
        <div className="br-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="br-progress-meta">
        <span>Step {currentIndex + 1}/{steps.length}</span>
        <span>{labels[currentStep]}</span>
      </div>
    </div>
  );
}
