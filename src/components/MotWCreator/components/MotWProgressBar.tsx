import type { MotWStep } from '../../../types/motw.types';
import { MOTW_STEP_ORDER, MOTW_STEP_LABELS } from '../../../types/motw.types';

interface MotWProgressBarProps {
  currentStep: MotWStep;
}

export default function MotWProgressBar({ currentStep }: MotWProgressBarProps) {
  const currentIndex = MOTW_STEP_ORDER.indexOf(currentStep);
  const percent = ((currentIndex + 1) / MOTW_STEP_ORDER.length) * 100;

  return (
    <div className="motw-progress-wrap">
      <div className="motw-progress-track">
        <div className="motw-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="motw-progress-meta">
        <span>Step {currentIndex + 1} / {MOTW_STEP_ORDER.length}</span>
        <span>{MOTW_STEP_LABELS[currentStep]}</span>
      </div>
    </div>
  );
}
