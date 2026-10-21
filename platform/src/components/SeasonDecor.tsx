/**
 * SeasonDecor — seasonal chrome art. Original inline SVG only (no
 * third-party assets), aria-hidden, never interactive.
 *
 * Placement rule: decor lives only where text can't be.
 *   variant="band" — projector: fixed inside the top 96px, which
 *                    halloween.css reserves by padding .lmd-full down.
 *   variant="bar"  — GM spotlight: fills the empty middle of the top bar.
 *
 * Motion is opt-in (prefers-reduced-motion: no-preference) in SeasonDecor.css.
 */

import type { SeasonId } from '../styles/seasons/seasons.config';
import './SeasonDecor.css';

interface Props {
  season: SeasonId | null;
  variant: 'band' | 'bar';
}

export default function SeasonDecor({ season, variant }: Props) {
  if (season !== 'halloween') return null;
  return (
    <div className={`season-decor season-decor--${variant}`} aria-hidden="true">
      {variant === 'band' ? (
        <>
          <Cobweb className="season-decor-web season-decor-web--left" />
          <Cobweb className="season-decor-web season-decor-web--right" />
          <Moon className="season-decor-moon" />
          <Bat className="season-decor-bat season-decor-bat--1" />
          <Bat className="season-decor-bat season-decor-bat--2" />
          <Bat className="season-decor-bat season-decor-bat--3" />
        </>
      ) : (
        <>
          <Bat className="season-decor-bat season-decor-bat--1" />
          <Bat className="season-decor-bat season-decor-bat--2" />
          <Bat className="season-decor-bat season-decor-bat--3" />
        </>
      )}
    </div>
  );
}

// ─── Art ──────────────────────────────────────────────────────────────────────

/** Quarter-circle web anchored at the top-left corner of a 96×96 box. */
const WEB_PATH = (() => {
  const R = 94;
  const spokes = [0, 18, 36, 54, 72, 90].map((deg) => (deg * Math.PI) / 180);
  const pt = (r: number, a: number) => [r * Math.cos(a), r * Math.sin(a)].map((n) => n.toFixed(1));
  let d = spokes.map((a) => `M0 0 L${pt(R, a).join(' ')}`).join(' ');
  // Sagging rings: each segment bows back toward the corner.
  for (const r of [22, 42, 62, 82]) {
    d += ` M${pt(r, spokes[0]).join(' ')}`;
    for (let i = 1; i < spokes.length; i++) {
      const mid = (spokes[i - 1] + spokes[i]) / 2;
      d += ` Q${pt(r * 0.82, mid).join(' ')} ${pt(r, spokes[i]).join(' ')}`;
    }
  }
  return d;
})();

function Cobweb({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" width="96" height="96" focusable="false">
      <path d={WEB_PATH} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Bat({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 30" width="40" height="19" focusable="false">
      <path
        fill="currentColor"
        d="M32 11 C30 8 28 8 27 10 C23 5 14 3 2 7 C8 9 10 13 9 17 C13 14 17 15 19 19
           C22 15 26 16 28 20 L32 24 L36 20 C38 16 42 15 45 19 C47 15 51 14 55 17
           C54 13 56 9 62 7 C50 3 41 5 37 10 C36 8 34 8 32 11 Z
           M29 10 L30 5 L32 9 L34 5 L35 10 Z"
      />
    </svg>
  );
}

function Moon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" width="60" height="60" focusable="false">
      <circle cx="30" cy="30" r="26" fill="currentColor" />
      <circle cx="21" cy="22" r="5" fill="#000" opacity="0.12" />
      <circle cx="37" cy="36" r="7" fill="#000" opacity="0.1" />
      <circle cx="35" cy="18" r="3" fill="#000" opacity="0.12" />
    </svg>
  );
}
