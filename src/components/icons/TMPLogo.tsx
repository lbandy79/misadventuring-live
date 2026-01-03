/**
 * TMP Logo Component
 * 
 * Uses the actual TMP logo PNG for hero/branding moments.
 * Drop your logo file at: public/images/tmp-logo.png
 */

import { CSSProperties } from 'react';

interface TMPLogoProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  variant?: 'full' | 'icon'; // full = with text, icon = just the D20
}

/**
 * The official TMP Logo
 * 
 * Usage:
 * 1. Place your logo PNG at: public/images/tmp-logo.png
 * 2. For icon-only version: public/images/tmp-icon.png
 * 
 * <TMPLogo size={200} /> - Full logo with text
 * <TMPLogo size={100} variant="icon" /> - Just the D20 icon
 */
export function TMPLogo({ 
  size = 200, 
  className = '',
  style,
  variant = 'full'
}: TMPLogoProps) {
  // Using the actual uploaded logo file
  const imageSrc = variant === 'icon' 
    ? '/images/TMAP-LOGO two color.png' 
    : '/images/TMAP-LOGO two color.png';
  
  return (
    <img 
      src={imageSrc}
      alt="The Misadventuring Party"
      className={`tmp-logo tmp-logo-${variant} ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: 'auto',
        ...style
      }}
    />
  );
}

export default TMPLogo;
