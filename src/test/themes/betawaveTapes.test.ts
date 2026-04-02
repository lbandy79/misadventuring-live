import { describe, it, expect } from 'vitest';
import { betawaveTapesTheme } from '../../themes/betawaveTapes.theme';

describe('Betawave Tapes theme', () => {
  const theme = betawaveTapesTheme;

  it('has correct id', () => {
    expect(theme.id).toBe('betawave-tapes');
  });

  it('is associated with kids-on-bikes system', () => {
    expect(theme.system).toBe('kids-on-bikes');
  });

  it('has name and description', () => {
    expect(theme.name).toContain('Betawave');
    expect(theme.description).toBeTruthy();
  });

  describe('colors', () => {
    it('has primary/secondary/tertiary', () => {
      expect(theme.colors.primary).toBeTruthy();
      expect(theme.colors.secondary).toBeTruthy();
      expect(theme.colors.tertiary).toBeTruthy();
    });

    it('tertiary is warm amber (differs from neon-nightmares)', () => {
      // Betawave uses warm amber, neon-nightmares uses acid green
      expect(theme.colors.tertiary).toBe('#F59E0B');
    });

    it('has background colors', () => {
      expect(theme.colors.background.main).toBeTruthy();
      expect(theme.colors.background.card).toBeTruthy();
      expect(theme.colors.background.elevated).toBeTruthy();
    });

    it('has text colors', () => {
      expect(theme.colors.text.primary).toBeTruthy();
      expect(theme.colors.text.secondary).toBeTruthy();
    });

    it('has voting colors', () => {
      expect(theme.colors.voting.optionA).toBeTruthy();
      expect(theme.colors.voting.optionB).toBeTruthy();
    });

    it('has status colors', () => {
      expect(theme.colors.status.success).toBeTruthy();
      expect(theme.colors.status.error).toBeTruthy();
    });
  });

  describe('typography', () => {
    it('uses VHS-era fonts', () => {
      expect(theme.typography.fonts.body).toContain('VT323');
      expect(theme.typography.fonts.display).toContain('Monoton');
    });

    it('includes Share Tech Mono as accent', () => {
      expect(theme.typography.fonts.accent).toContain('Share Tech Mono');
    });

    it('has google fonts URL', () => {
      expect(theme.typography.googleFontsUrl).toContain('fonts.googleapis.com');
    });
  });

  describe('animations', () => {
    it('uses bw- prefixed keyframe names (not nn-)', () => {
      Object.values(theme.animations.keyframes).forEach(name => {
        expect(name).toMatch(/^bw-/);
      });
    });

    it('has all required keyframe slots', () => {
      expect(theme.animations.keyframes.voteSelect).toBeTruthy();
      expect(theme.animations.keyframes.idle).toBeTruthy();
      expect(theme.animations.keyframes.victory).toBeTruthy();
    });
  });

  describe('effects', () => {
    it('has glow shadow with amber component', () => {
      expect(theme.effects.shadows.glow).toContain('245, 158, 11');
    });

    it('has scan line background effect', () => {
      expect(theme.effects.backgroundEffects.main).toContain('repeating-linear-gradient');
    });
  });

  describe('assets', () => {
    it('has basePath pointing to theme assets', () => {
      expect(theme.assets.basePath).toBeTruthy();
    });

    it('has logo', () => {
      expect(theme.assets.logo.src).toBeTruthy();
      expect(theme.assets.logo.alt).toContain('Betawave');
    });
  });
});
