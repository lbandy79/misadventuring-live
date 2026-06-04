import type { ReactNode } from 'react';

interface MotWOptionCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  footer?: ReactNode;
  onClick: () => void;
}

export default function MotWOptionCard({
  title,
  subtitle,
  description,
  selected = false,
  disabled = false,
  badge,
  footer,
  onClick,
}: MotWOptionCardProps) {
  return (
    <button
      type="button"
      className={`motw-option-card${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="motw-option-head">
        <h3>{title}</h3>
        {badge ? <span className="motw-badge">{badge}</span> : null}
      </div>
      {subtitle ? <p className="motw-option-subtitle">{subtitle}</p> : null}
      {description ? <p className="motw-option-description">{description}</p> : null}
      {footer ? <div className="motw-option-footer">{footer}</div> : null}
    </button>
  );
}
