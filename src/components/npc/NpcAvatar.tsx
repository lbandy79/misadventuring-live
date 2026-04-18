import { useState } from 'react';
import './NpcAvatar.css';

interface NpcAvatarProps {
  name: string;
  size?: number;
  style?: string;
  className?: string;
}

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

export default function NpcAvatar({ name, size = 64, style = 'pixel-art', className = '' }: NpcAvatarProps) {
  const [failed, setFailed] = useState(false);
  const seed = encodeURIComponent(name.trim());
  const url = `${DICEBEAR_BASE}/${style}/svg?seed=${seed}`;

  if (failed || !name.trim()) {
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    // Deterministic hue from name
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;

    return (
      <div
        className={`npc-avatar npc-avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          backgroundColor: `hsl(${hue}, 60%, 25%)`,
          color: `hsl(${hue}, 80%, 75%)`,
        }}
        title={name}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      className={`npc-avatar ${className}`}
      src={url}
      alt={`${name}'s avatar`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
