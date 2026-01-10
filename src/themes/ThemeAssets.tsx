/**
 * ThemeAssets - Lazy-loading themed asset system
 * 
 * Provides components for rendering themed SVG icons, card frames,
 * and other visual assets with Don Bluth-inspired animations.
 */

import { useState, useEffect, memo } from 'react';
import { useTheme } from './ThemeProvider';
import type { ThemeIcon as ThemeIconConfig } from './theme.types';
import './ThemeAssets.css';

// =============================================================================
// ASSET CACHE - Prevents re-fetching SVGs
// =============================================================================

const svgCache = new Map<string, string>();

async function fetchSvg(src: string): Promise<string> {
  if (svgCache.has(src)) {
    return svgCache.get(src)!;
  }
  
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Failed to load: ${src}`);
    const svgText = await response.text();
    svgCache.set(src, svgText);
    return svgText;
  } catch (error) {
    console.warn(`[ThemeAssets] Failed to load SVG: ${src}`, error);
    return '';
  }
}

// =============================================================================
// THEME ICON COMPONENT
// =============================================================================

interface ThemeIconProps {
  /** Icon key from theme assets (optionA, optionB, optionC, or custom) */
  iconKey: string;
  /** Override the icon config */
  config?: ThemeIconConfig;
  /** Size in pixels */
  size?: number;
  /** Whether the icon is in selected/active state */
  selected?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Accessibility label override */
  ariaLabel?: string;
}

export const ThemeIcon = memo(function ThemeIcon({
  iconKey,
  config: configOverride,
  size = 48,
  selected = false,
  className = '',
  onClick,
  ariaLabel,
}: ThemeIconProps) {
  const { theme } = useTheme();
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Get icon config from theme or override
  const iconConfig = configOverride || theme.assets?.voteIcons?.[iconKey];
  
  useEffect(() => {
    if (!iconConfig?.src) return;
    
    setIsLoaded(false);
    
    if (iconConfig.type === 'svg') {
      fetchSvg(iconConfig.src).then((svg) => {
        setSvgContent(svg);
        setIsLoaded(true);
      });
    } else if (iconConfig.type === 'img') {
      // For regular images, just mark as loaded
      setIsLoaded(true);
    }
    // TODO: Add Lottie support when needed
  }, [iconConfig?.src, iconConfig?.type]);
  
  if (!iconConfig) {
    // Fallback to emoji or placeholder
    return (
      <span 
        className={`theme-icon theme-icon--fallback ${className}`}
        style={{ fontSize: size * 0.8 }}
        role="img"
        aria-label={ariaLabel || iconKey}
      >
        {iconKey === 'optionA' ? '⚓' : iconKey === 'optionB' ? '💎' : '💀'}
      </span>
    );
  }
  
  const animationClass = selected 
    ? iconConfig.selectAnimation 
    : iconConfig.idleAnimation;
  
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    '--icon-size': `${size}px`,
  } as React.CSSProperties;
  
  return (
    <span
      className={`theme-icon ${animationClass || ''} ${selected ? 'theme-icon--selected' : ''} ${isLoaded ? 'theme-icon--loaded' : ''} ${className}`}
      style={containerStyle}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={ariaLabel || iconConfig.alt}
      tabIndex={onClick ? 0 : undefined}
    >
      {iconConfig.type === 'svg' && svgContent && (
        <span 
          className="theme-icon__svg"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
      {iconConfig.type === 'img' && (
        <img 
          src={iconConfig.src} 
          alt={iconConfig.alt}
          className="theme-icon__img"
          loading="lazy"
        />
      )}
    </span>
  );
});

// =============================================================================
// THEME LOGO COMPONENT
// =============================================================================

interface ThemeLogoProps {
  /** Size in pixels (applies to max dimension) */
  size?: number;
  /** Additional CSS class */
  className?: string;
  /** Alt text override */
  alt?: string;
}

export const ThemeLogo = memo(function ThemeLogo({
  size = 120,
  className = '',
  alt,
}: ThemeLogoProps) {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);
  
  // Build the logo path - use theme assets if available, otherwise construct from theme id
  const logoSrc = theme.assets?.logo?.src 
    ?? `/assets/themes/${theme.id}/logo.png`;
  const logoAlt = alt ?? theme.assets?.logo?.alt ?? `${theme.name} Logo`;
  
  // Reset error state when theme changes
  useEffect(() => {
    setHasError(false);
  }, [theme.id]);
  
  if (hasError) {
    // Fallback: show styled text with the theme name
    return (
      <div 
        className={`theme-logo theme-logo--fallback theme-logo--${theme.id} ${className}`}
        style={{ 
          fontSize: Math.max(size * 0.2, 16),
          color: theme.colors.primary,
          fontFamily: theme.typography.fonts.display,
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        {theme.name}
      </div>
    );
  }
  
  return (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={`theme-logo theme-logo--${theme.id} ${className}`}
      style={{ 
        maxHeight: size, 
        maxWidth: size * 2, 
        objectFit: 'contain',
        display: 'block',
      }}
      loading="eager"
      onError={() => {
        console.warn(`[ThemeLogo] Failed to load: ${logoSrc}`);
        setHasError(true);
      }}
    />
  );
});

// =============================================================================
// CARD FRAME COMPONENT
// =============================================================================

interface CardFrameProps {
  children: React.ReactNode;
  className?: string;
  /** Whether to show the texture overlay */
  showTexture?: boolean;
}

export const CardFrame = memo(function CardFrame({
  children,
  className = '',
  showTexture = true,
}: CardFrameProps) {
  const { theme } = useTheme();
  const [frameSvg, setFrameSvg] = useState<string>('');
  
  const frameConfig = theme.assets?.cardFrame;
  
  useEffect(() => {
    if (frameConfig?.border) {
      fetchSvg(frameConfig.border).then(setFrameSvg);
    }
  }, [frameConfig?.border]);
  
  const frameStyle: React.CSSProperties = frameConfig?.effect 
    ? { filter: frameConfig.effect }
    : {};
  
  return (
    <div className={`card-frame card-frame--${theme.id} ${className}`} style={frameStyle}>
      {frameSvg && (
        <div 
          className="card-frame__border"
          dangerouslySetInnerHTML={{ __html: frameSvg }}
        />
      )}
      {showTexture && frameConfig?.texture && (
        <div 
          className="card-frame__texture"
          style={{ backgroundImage: `url(${frameConfig.texture})` }}
        />
      )}
      <div className="card-frame__content">
        {children}
      </div>
    </div>
  );
});

// =============================================================================
// PROGRESS BAR COMPONENT - Don Bluth Style
// =============================================================================

interface ThemedProgressBarProps {
  /** Progress segments with labels and percentages */
  segments: Array<{
    label: string;
    percent: number;
    color?: string;
  }>;
  /** Height in pixels */
  height?: number;
  /** Show end cap decoration */
  showEndCap?: boolean;
  className?: string;
}

export const ThemedProgressBar = memo(function ThemedProgressBar({
  segments,
  height = 40,
  showEndCap = false,
  className = '',
}: ThemedProgressBarProps) {
  const { theme } = useTheme();
  const progressConfig = theme.assets?.progressBar;
  
  const trackStyle: React.CSSProperties = {
    height,
    backgroundImage: progressConfig?.trackTexture 
      ? `url(${progressConfig.trackTexture})`
      : undefined,
  };
  
  return (
    <div 
      className={`themed-progress themed-progress--${theme.id} ${className}`}
      style={trackStyle}
      role="progressbar"
      aria-valuenow={segments[0]?.percent || 0}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="themed-progress__track">
        {segments.map((segment, index) => (
          <div
            key={segment.label}
            className={`themed-progress__fill themed-progress__fill--${index}`}
            style={{
              width: `${segment.percent}%`,
              background: segment.color || (progressConfig?.fillStyle) || theme.colors.voting[`option${String.fromCharCode(65 + index)}` as keyof typeof theme.colors.voting] || theme.colors.primary,
            }}
          >
            {segment.percent > 10 && (
              <span className="themed-progress__label">
                {segment.label}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {showEndCap && progressConfig?.endCap && (
        <ThemeIcon 
          iconKey="endCap"
          config={{
            src: progressConfig.endCap,
            type: 'svg',
            alt: 'Progress end',
            idleAnimation: theme.animations.keyframes.idle,
          }}
          size={height * 0.8}
          className="themed-progress__endcap"
        />
      )}
    </div>
  );
});

// =============================================================================
// PRELOAD UTILITY
// =============================================================================

/**
 * Preload theme assets for smoother transitions
 */
export function usePreloadThemeAssets() {
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!theme.assets) return;
    
    const assets = theme.assets;
    const urlsToPreload: string[] = [];
    
    // Collect all asset URLs
    if (assets.voteIcons) {
      Object.values(assets.voteIcons).forEach((icon) => {
        if (icon?.src) urlsToPreload.push(icon.src);
      });
    }
    
    if (assets.cardFrame?.border) {
      urlsToPreload.push(assets.cardFrame.border);
    }
    
    if (assets.winnerBanner?.graphic) {
      urlsToPreload.push(assets.winnerBanner.graphic);
    }
    
    // Preload SVGs in background
    urlsToPreload.forEach((url) => {
      if (url.endsWith('.svg')) {
        fetchSvg(url);
      } else {
        // Preload images
        const img = new Image();
        img.src = url;
      }
    });
  }, [theme.assets]);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { ThemeIconProps, ThemeLogoProps, CardFrameProps, ThemedProgressBarProps };
