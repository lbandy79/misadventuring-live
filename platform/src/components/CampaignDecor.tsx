/**
 * CampaignDecor — per-campaign themed decorations.
 *
 * Register a new show's asset bundle in CAMPAIGN_DECOR_REGISTRY and
 * drop <CampaignDecor campaignId="your-show-id" /> anywhere on the page.
 * All SVGs are inline placeholders — swap the <svg> contents for final art.
 *
 * Usage:
 *   <div style={{ position: 'relative' }}>
 *     <CampaignDecor campaignId="honey-heist" />
 *     {children}
 *   </div>
 *
 * Or render specific decoration types with the `slot` prop:
 *   <CampaignDecor campaignId="honey-heist" slot="corners" />
 *   <CampaignDecor campaignId="honey-heist" slot="doodles" />
 */

import type { ReactNode } from 'react';

export type DecorSlot = 'corners' | 'borders' | 'doodles' | 'all';

export interface CampaignAssetBundle {
  cornerTopLeft?: ReactNode;
  cornerTopRight?: ReactNode;
  cornerBottomLeft?: ReactNode;
  cornerBottomRight?: ReactNode;
  borderTop?: ReactNode;
  borderBottom?: ReactNode;
  doodles?: ReactNode[];
}

// ─── Asset bundles ──────────────────────────────────────────────────────────

const HoneyHeistBundle: CampaignAssetBundle = {
  cornerTopLeft: <DrippingHoneyCorner rotate={0} />,
  cornerTopRight: <DrippingHoneyCorner rotate={90} />,
  cornerBottomLeft: <DrippingHoneyCorner rotate={270} />,
  cornerBottomRight: <DrippingHoneyCorner rotate={180} />,
  borderTop: <HoneycombBorder />,
  borderBottom: <HoneycombBorder />,
  doodles: [<BeeStamp key="bee-1" />, <WantedPoster key="wanted" />, <BeeStamp key="bee-2" flip />],
};

// ─── Registry ────────────────────────────────────────────────────────────────
// To add a new show: import or define its bundle above, then add an entry here.

const CAMPAIGN_DECOR_REGISTRY: Record<string, CampaignAssetBundle> = {
  'honey-heist': HoneyHeistBundle,
  'mad-libs-honey-heist': HoneyHeistBundle,
};

// ─── Main component ──────────────────────────────────────────────────────────

interface CampaignDecorProps {
  campaignId: string;
  slot?: DecorSlot;
  className?: string;
}

export function CampaignDecor({ campaignId, slot = 'all', className }: CampaignDecorProps) {
  const bundle = CAMPAIGN_DECOR_REGISTRY[campaignId];
  if (!bundle) return null;

  const showCorners = slot === 'all' || slot === 'corners';
  const showBorders = slot === 'all' || slot === 'borders';
  const showDoodles = slot === 'all' || slot === 'doodles';

  return (
    <div
      className={['campaign-decor', `campaign-decor--${campaignId}`, className].filter(Boolean).join(' ')}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {showCorners && (
        <>
          {bundle.cornerTopLeft && (
            <div className="campaign-decor__corner campaign-decor__corner--tl" style={cornerStyle('top', 'left')}>
              {bundle.cornerTopLeft}
            </div>
          )}
          {bundle.cornerTopRight && (
            <div className="campaign-decor__corner campaign-decor__corner--tr" style={cornerStyle('top', 'right')}>
              {bundle.cornerTopRight}
            </div>
          )}
          {bundle.cornerBottomLeft && (
            <div className="campaign-decor__corner campaign-decor__corner--bl" style={cornerStyle('bottom', 'left')}>
              {bundle.cornerBottomLeft}
            </div>
          )}
          {bundle.cornerBottomRight && (
            <div className="campaign-decor__corner campaign-decor__corner--br" style={cornerStyle('bottom', 'right')}>
              {bundle.cornerBottomRight}
            </div>
          )}
        </>
      )}

      {showBorders && (
        <>
          {bundle.borderTop && (
            <div className="campaign-decor__border campaign-decor__border--top" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              {bundle.borderTop}
            </div>
          )}
          {bundle.borderBottom && (
            <div className="campaign-decor__border campaign-decor__border--bottom" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              {bundle.borderBottom}
            </div>
          )}
        </>
      )}

      {showDoodles && bundle.doodles && bundle.doodles.map((doodle, i) => (
        <div key={i} className={`campaign-decor__doodle campaign-decor__doodle--${i}`} style={doodlePositions[i] ?? {}}>
          {doodle}
        </div>
      ))}
    </div>
  );
}

function cornerStyle(v: 'top' | 'bottom', h: 'left' | 'right'): React.CSSProperties {
  return { position: 'absolute', [v]: 0, [h]: 0 };
}

// Scattered doodle positions — override per-campaign via CSS if needed.
const doodlePositions: React.CSSProperties[] = [
  { position: 'absolute', top: '18%', right: '3%' },
  { position: 'absolute', top: '50%', left: '2%', transform: 'translateY(-50%)' },
  { position: 'absolute', bottom: '20%', right: '4%' },
];

// ─── SVG Placeholder Assets — Honey Heist ───────────────────────────────────
// These are intentionally simple stand-ins. Replace the <svg> innards with
// final Illustrator/Figma exports. Keep the wrapper divs and class names.

function DrippingHoneyCorner({ rotate }: { rotate: number }) {
  return (
    <svg
      width="80" height="80" viewBox="0 0 80 80"
      className="campaign-decor__svg campaign-decor__svg--honey-corner"
      style={{ transform: `rotate(${rotate}deg)` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Placeholder: L-shaped amber corner with honey drips */}
      <path d="M0,0 L60,0 L60,8 L8,8 L8,60 L0,60 Z" fill="#e0a022" opacity="0.85" />
      {/* Drip 1 */}
      <path d="M16,8 Q18,20 16,28 Q14,20 16,8 Z" fill="#c8831a" />
      {/* Drip 2 */}
      <path d="M28,8 Q31,18 29,24 Q27,18 28,8 Z" fill="#c8831a" />
      {/* Drip 3 */}
      <path d="M8,16 Q20,19 28,17 Q20,15 8,16 Z" fill="#c8831a" />
      {/* Corner accent dot */}
      <circle cx="4" cy="4" r="3" fill="#f5c842" />
    </svg>
  );
}

function HoneycombBorder() {
  // Repeating hexagon strip — 100% wide, ~20px tall.
  // SWAP: replace with a tiling SVG pattern or a real asset.
  const hexPath = 'M10,2 L18,2 L22,9 L18,16 L10,16 L6,9 Z';
  const hexes = Array.from({ length: 14 });
  return (
    <svg
      width="100%" height="20" viewBox="0 0 280 18"
      preserveAspectRatio="xMidYMid slice"
      className="campaign-decor__svg campaign-decor__svg--honeycomb-border"
      xmlns="http://www.w3.org/2000/svg"
    >
      {hexes.map((_, i) => (
        <path
          key={i}
          d={hexPath}
          transform={`translate(${i * 20}, 1)`}
          fill="none"
          stroke="#e0a022"
          strokeWidth="1.2"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}

function BeeStamp({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="48" height="48" viewBox="0 0 48 48"
      className="campaign-decor__svg campaign-decor__svg--bee"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Placeholder bee silhouette — body */}
      <ellipse cx="24" cy="26" rx="9" ry="13" fill="#e0a022" opacity="0.9" />
      {/* Stripes */}
      <rect x="15" y="22" width="18" height="3" fill="#1c1c1c" opacity="0.6" rx="1" />
      <rect x="15" y="28" width="18" height="3" fill="#1c1c1c" opacity="0.6" rx="1" />
      {/* Head */}
      <circle cx="24" cy="13" r="7" fill="#e0a022" opacity="0.9" />
      {/* Wings */}
      <ellipse cx="13" cy="20" rx="8" ry="5" fill="#f5f0e0" opacity="0.6" transform="rotate(-20, 13, 20)" />
      <ellipse cx="35" cy="20" rx="8" ry="5" fill="#f5f0e0" opacity="0.6" transform="rotate(20, 35, 20)" />
      {/* Antennae */}
      <line x1="21" y1="7" x2="17" y2="2" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="27" y1="7" x2="31" y2="2" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="2" r="1.5" fill="#1c1c1c" />
      <circle cx="31" cy="2" r="1.5" fill="#1c1c1c" />
    </svg>
  );
}

function WantedPoster() {
  return (
    <svg
      width="72" height="56" viewBox="0 0 72 56"
      className="campaign-decor__svg campaign-decor__svg--wanted"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Poster background */}
      <rect x="1" y="1" width="70" height="54" rx="3" fill="#f5ead0" stroke="#c8831a" strokeWidth="2" />
      {/* Header band */}
      <rect x="1" y="1" width="70" height="14" rx="3" fill="#c8831a" />
      <text x="36" y="12" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#f5ead0" fontFamily="serif">WANTED</text>
      {/* Bear silhouettes */}
      <ellipse cx="24" cy="36" rx="8" ry="10" fill="#1c1c1c" opacity="0.7" />
      <circle cx="24" cy="24" r="5" fill="#1c1c1c" opacity="0.7" />
      <ellipse cx="48" cy="36" rx="8" ry="10" fill="#1c1c1c" opacity="0.7" />
      <circle cx="48" cy="24" r="5" fill="#1c1c1c" opacity="0.7" />
      {/* Caption */}
      <text x="36" y="51" textAnchor="middle" fontSize="5.5" fill="#c8831a" fontFamily="serif" fontWeight="bold">2 BEARS · ARMED WITH HONEY</text>
    </svg>
  );
}
