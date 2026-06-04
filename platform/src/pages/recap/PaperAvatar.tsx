/**
 * Recap-specific avatar — DiceBear pixel-art seeded from name, framed by
 * a paper-cutout halo. Mirrors the seed pattern used by the legacy
 * NpcAvatar component but skips the neon-VHS chrome so it composes with
 * the pen-and-paper substrate.
 */

import { useState } from 'react';

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

interface PaperAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function PaperAvatar({ name, size = 88, className = '' }: PaperAvatarProps) {
  const [failed, setFailed] = useState(false);
  const safeName = name ?? '';
  const seed = encodeURIComponent(safeName.trim());
  const url = `${DICEBEAR_BASE}/pixel-art/svg?seed=${seed}`;

  if (failed || !safeName.trim()) {
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    const initial = safeName.trim().charAt(0).toUpperCase() || '?';
    return (
      <div
        className={`recap-avatar recap-avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.42,
          background: `hsl(${hue}, 50%, 88%)`,
          color: `hsl(${hue}, 60%, 25%)`,
        }}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      className={`recap-avatar ${className}`}
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
