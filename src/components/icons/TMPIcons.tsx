/**
 * TMP Custom Icon System
 * 
 * "Where Failing is Fun" - Custom SVG icons based on TMP brand identity.
 * D20 showing a 1, skull with flowers, theme-aware colors.
 * 
 * These icons are theme-aware and replace generic emojis throughout the app.
 * Colors automatically sync with the active theme via CSS variables:
 * - --tmp-icon-primary (defaults to coral #FF6B6B for Base theme)
 * - --tmp-icon-secondary (defaults to teal #2DD4BF for Base theme)
 */

import { CSSProperties } from 'react';

interface IconProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
}

// Shared style object that sets up CSS variable inheritance
const iconStyle = (style?: CSSProperties): CSSProperties => ({
  '--icon-primary': 'var(--tmp-icon-primary, #FF6B6B)',
  '--icon-secondary': 'var(--tmp-icon-secondary, #2DD4BF)',
  ...style
} as CSSProperties);

/**
 * The iconic TMP D20 showing a "1"
 * Use for: Loading states, waiting screens, branding moments
 */
export function TMPD20({ 
  size = 48, 
  className = '', 
  style,
  animated = false 
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-d20 ${animated ? 'tmp-icon-animated' : ''} ${className}`}
      style={iconStyle(style)}
      aria-label="D20 die showing 1"
    >
      {/* D20 outer shape */}
      <polygon 
        points="50,5 95,30 95,70 50,95 5,70 5,30" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Inner triangle faces - creates depth */}
      <polygon 
        points="50,5 50,50 5,30" 
        style={{ fill: 'var(--icon-primary)' }}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <polygon 
        points="50,5 95,30 50,50" 
        style={{ fill: 'var(--icon-secondary)', opacity: 0.8 }}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <polygon 
        points="50,50 95,30 95,70" 
        style={{ fill: 'var(--icon-primary)', opacity: 0.9 }}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <polygon 
        points="50,50 95,70 50,95" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <polygon 
        points="50,50 50,95 5,70" 
        style={{ fill: 'var(--icon-primary)' }}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <polygon 
        points="50,50 5,70 5,30" 
        style={{ fill: 'var(--icon-secondary)', opacity: 0.7 }}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Center face with the "1" */}
      <polygon 
        points="50,20 75,50 50,80 25,50" 
        style={{ fill: 'var(--icon-primary)' }}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* The legendary "1" */}
      <text 
        x="50" 
        y="58" 
        textAnchor="middle" 
        fontSize="28" 
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="currentColor"
      >
        1
      </text>
    </svg>
  );
}

/**
 * TMP Skull icon (from logo)
 * Use for: Failures, critical fails, death saves, dramatic moments
 */
export function TMPSkull({ 
  size = 48, 
  className = '', 
  style,
  animated = false 
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-skull ${animated ? 'tmp-icon-animated' : ''} ${className}`}
      style={iconStyle(style)}
      aria-label="Skull"
    >
      {/* Skull shape */}
      <ellipse cx="50" cy="42" rx="35" ry="32" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Jaw */}
      <path 
        d="M 25 55 Q 25 75 35 80 L 35 70 L 45 75 L 50 70 L 55 75 L 65 70 L 65 80 Q 75 75 75 55" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Left eye socket */}
      <ellipse cx="35" cy="40" rx="10" ry="12" fill="currentColor"/>
      {/* Right eye socket */}
      <ellipse cx="65" cy="40" rx="10" ry="12" fill="currentColor"/>
      {/* Nose */}
      <path d="M 45 52 L 50 60 L 55 52 Z" fill="currentColor"/>
    </svg>
  );
}

/**
 * Voting Open indicator - Crossed swords with energy
 * Use for: Active voting state
 */
export function TMPVotingOpen({ 
  size = 24, 
  className = '', 
  style,
  animated = true 
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-voting-open ${animated ? 'tmp-icon-pulse' : ''} ${className}`}
      style={iconStyle(style)}
      aria-label="Voting Open"
    >
      {/* Energy burst background */}
      <circle cx="50" cy="50" r="40" style={{ fill: 'var(--icon-primary)', opacity: 0.2 }}/>
      <circle cx="50" cy="50" r="30" style={{ fill: 'var(--icon-primary)', opacity: 0.3 }}/>
      {/* Left sword */}
      <path 
        d="M 20 80 L 45 45 L 48 48 L 23 83 Z" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M 45 45 L 55 35 L 52 32 L 42 42 Z" style={{ fill: 'var(--icon-secondary)' }}/>
      <circle cx="18" cy="82" r="5" style={{ fill: 'var(--icon-primary)' }}/>
      {/* Right sword */}
      <path 
        d="M 80 80 L 55 45 L 52 48 L 77 83 Z" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M 55 45 L 45 35 L 48 32 L 58 42 Z" style={{ fill: 'var(--icon-secondary)' }}/>
      <circle cx="82" cy="82" r="5" style={{ fill: 'var(--icon-primary)' }}/>
      {/* Center clash spark */}
      <circle cx="50" cy="45" r="8" style={{ fill: 'var(--icon-primary)' }}/>
      <circle cx="50" cy="45" r="4" fill="#fff"/>
    </svg>
  );
}

/**
 * Voting Closed indicator - Sealed scroll/treasure
 * Use for: Voting ended state
 */
export function TMPVotingClosed({ 
  size = 24, 
  className = '', 
  style,
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-voting-closed ${className}`}
      style={iconStyle(style)}
      aria-label="Voting Closed"
    >
      {/* Scroll body */}
      <rect x="20" y="25" width="60" height="50" rx="3" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Top roll */}
      <ellipse cx="50" cy="25" rx="32" ry="8" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Bottom roll */}
      <ellipse cx="50" cy="75" rx="32" ry="8" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Wax seal */}
      <circle cx="50" cy="50" r="15" style={{ fill: 'var(--icon-primary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Seal imprint - TMP "1" */}
      <text 
        x="50" 
        y="56" 
        textAnchor="middle" 
        fontSize="18" 
        fontWeight="bold"
        fill="currentColor"
      >
        1
      </text>
    </svg>
  );
}

/**
 * Sound On - Bardic horn
 * Use for: Sound enabled state
 */
export function TMPSoundOn({ 
  size = 24, 
  className = '', 
  style,
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-sound-on ${className}`}
      style={iconStyle(style)}
      aria-label="Sound On"
    >
      {/* Horn body */}
      <path 
        d="M 15 40 L 35 35 L 35 65 L 15 60 Z" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Horn bell */}
      <ellipse cx="55" cy="50" rx="25" ry="30" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="55" cy="50" rx="15" ry="20" fill="currentColor" opacity="0.3"/>
      {/* Sound waves */}
      <path 
        d="M 75 35 Q 90 50 75 65" 
        fill="none" 
        style={{ stroke: 'var(--icon-primary)' }}
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <path 
        d="M 82 25 Q 100 50 82 75" 
        fill="none" 
        style={{ stroke: 'var(--icon-primary)', opacity: 0.7 }}
        strokeWidth="3" 
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Sound Off - Muted horn
 * Use for: Sound disabled state
 */
export function TMPSoundOff({ 
  size = 24, 
  className = '', 
  style,
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-sound-off ${className}`}
      style={iconStyle(style)}
      aria-label="Sound Off"
    >
      {/* Horn body */}
      <path 
        d="M 15 40 L 35 35 L 35 65 L 15 60 Z" 
        style={{ fill: 'var(--icon-secondary)', opacity: 0.5 }}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Horn bell */}
      <ellipse cx="55" cy="50" rx="25" ry="30" style={{ fill: 'var(--icon-secondary)', opacity: 0.5 }} stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="55" cy="50" rx="15" ry="20" fill="currentColor" opacity="0.2"/>
      {/* X mark */}
      <line x1="70" y1="30" x2="95" y2="70" style={{ stroke: 'var(--icon-primary)' }} strokeWidth="6" strokeLinecap="round"/>
      <line x1="95" y1="30" x2="70" y2="70" style={{ stroke: 'var(--icon-primary)' }} strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * Warning/Error - Cracked potion
 * Use for: Error states, connection issues
 */
export function TMPWarning({ 
  size = 24, 
  className = '', 
  style,
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-warning ${className}`}
      style={iconStyle(style)}
      aria-label="Warning"
    >
      {/* Potion bottle */}
      <path 
        d="M 40 15 L 40 30 L 25 50 L 25 80 Q 25 90 35 90 L 65 90 Q 75 90 75 80 L 75 50 L 60 30 L 60 15 Z" 
        style={{ fill: 'var(--icon-secondary)' }}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Bottle neck */}
      <rect x="38" y="10" width="24" height="10" rx="2" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Liquid */}
      <path 
        d="M 28 55 L 72 55 L 72 80 Q 72 87 65 87 L 35 87 Q 28 87 28 80 Z" 
        style={{ fill: 'var(--icon-primary)', opacity: 0.7 }}
      />
      {/* Crack */}
      <path 
        d="M 55 25 L 60 40 L 52 55 L 62 75" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bubbles */}
      <circle cx="40" cy="70" r="4" fill="#fff" opacity="0.6"/>
      <circle cx="55" cy="65" r="3" fill="#fff" opacity="0.5"/>
    </svg>
  );
}

/**
 * Checkmark/Confirmed - Wax seal stamp
 * Use for: Vote confirmed, success states
 */
export function TMPCheck({ 
  size = 24, 
  className = '', 
  style,
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-check ${className}`}
      style={iconStyle(style)}
      aria-label="Confirmed"
    >
      {/* Seal outer */}
      <circle cx="50" cy="50" r="40" style={{ fill: 'var(--icon-primary)' }} stroke="currentColor" strokeWidth="2"/>
      {/* Seal wavy edge */}
      <circle cx="50" cy="50" r="35" style={{ fill: 'var(--icon-secondary)' }} stroke="currentColor" strokeWidth="1"/>
      {/* Inner circle */}
      <circle cx="50" cy="50" r="25" style={{ fill: 'var(--icon-primary)' }}/>
      {/* Checkmark */}
      <path 
        d="M 30 50 L 45 65 L 72 35" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Waiting/Loading - Animated D20 variant
 * Use for: Loading states with spin animation
 */
export function TMPLoading({ 
  size = 48, 
  className = '', 
  style,
}: IconProps) {
  return (
    <div 
      className={`tmp-icon-loading ${className}`} 
      style={{ 
        width: size, 
        height: size, 
        animation: 'tmp-spin 2s ease-in-out infinite',
        ...style 
      }}
    >
      <TMPD20 size={size} />
    </div>
  );
}

/**
 * Flower decoration (from logo)
 * Use for: Decorative elements, success flourishes
 */
export function TMPFlower({ 
  size = 24, 
  className = '', 
  style,
}: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`tmp-icon tmp-flower ${className}`}
      style={iconStyle(style)}
      aria-label="Flower"
    >
      {/* Petals */}
      <ellipse cx="50" cy="25" rx="15" ry="20" style={{ fill: 'var(--icon-primary)' }}/>
      <ellipse cx="75" cy="40" rx="15" ry="20" style={{ fill: 'var(--icon-primary)' }} transform="rotate(60 75 40)"/>
      <ellipse cx="70" cy="70" rx="15" ry="20" style={{ fill: 'var(--icon-primary)' }} transform="rotate(120 70 70)"/>
      <ellipse cx="50" cy="80" rx="15" ry="20" style={{ fill: 'var(--icon-primary)' }} transform="rotate(180 50 80)"/>
      <ellipse cx="30" cy="70" rx="15" ry="20" style={{ fill: 'var(--icon-primary)' }} transform="rotate(240 30 70)"/>
      <ellipse cx="25" cy="40" rx="15" ry="20" style={{ fill: 'var(--icon-primary)' }} transform="rotate(300 25 40)"/>
      {/* Center */}
      <circle cx="50" cy="50" r="12" fill="currentColor"/>
    </svg>
  );
}

// Export all icons
export const TMPIcons = {
  D20: TMPD20,
  Skull: TMPSkull,
  VotingOpen: TMPVotingOpen,
  VotingClosed: TMPVotingClosed,
  SoundOn: TMPSoundOn,
  SoundOff: TMPSoundOff,
  Warning: TMPWarning,
  Check: TMPCheck,
  Loading: TMPLoading,
  Flower: TMPFlower,
};

export default TMPIcons;
