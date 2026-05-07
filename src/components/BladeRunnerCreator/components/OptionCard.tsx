import type { ReactNode } from 'react';

interface OptionCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  footer?: ReactNode;
  onClick: () => void;
}

export default function OptionCard({
  title,
  subtitle,
  description,
  selected = false,
  disabled = false,
  badge,
  footer,
  onClick,
}: OptionCardProps) {
  return (
    <button type="button" className={`br-option-card ${selected ? 'selected' : ''}`} onClick={onClick} disabled={disabled}>
      <div className="br-option-head">
        <h3>{title}</h3>
        {badge ? <span className="br-badge">{badge}</span> : null}
      </div>
      {subtitle ? <p className="br-option-subtitle">{subtitle}</p> : null}
      {description ? <p className="br-option-description">{description}</p> : null}
      {footer ? <div className="br-option-footer">{footer}</div> : null}
    </button>
  );
}
