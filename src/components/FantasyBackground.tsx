/**
 * FantasyBackground - Magical ambient background effects
 * 
 * Adds floating particles, twinkling stars, vignette, and texture
 * for an immersive fantasy atmosphere.
 */

import { useTheme } from '../themes/ThemeProvider';
import '../themes/beastOfRidgefall.animations.css';

export default function FantasyBackground() {
  const { themeId } = useTheme();
  
  // Only show for beast-of-ridgefall theme
  if (themeId !== 'beast-of-ridgefall') {
    return null;
  }

  return (
    <div className="fantasy-background" aria-hidden="true">
      {/* Vignette for depth */}
      <div className="fantasy-vignette" />
      
      {/* Subtle texture overlay */}
      <div className="fantasy-texture" />
      
      {/* Floating coral particles */}
      <div className="fantasy-particle" />
      <div className="fantasy-particle" />
      <div className="fantasy-particle" />
      <div className="fantasy-particle" />
      <div className="fantasy-particle" />
      <div className="fantasy-particle" />
      
      {/* Floating teal particles */}
      <div className="fantasy-particle teal" />
      <div className="fantasy-particle teal" />
      <div className="fantasy-particle teal" />
      
      {/* Twinkling stars */}
      <div className="fantasy-star" />
      <div className="fantasy-star" />
      <div className="fantasy-star" />
      <div className="fantasy-star" />
      <div className="fantasy-star" />
      <div className="fantasy-star" />
    </div>
  );
}
