import { describe, it, expect } from 'vitest';
import { validateContent, containsProfanity, cleanText } from '../../utils/contentFilter';

describe('contentFilter', () => {
  describe('containsProfanity', () => {
    it('returns false for clean text', () => {
      expect(containsProfanity('Bartender at Lucky Straws')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(containsProfanity('')).toBe(false);
    });

    it('returns false for null/undefined-ish', () => {
      expect(containsProfanity('')).toBe(false);
    });
  });

  describe('cleanText', () => {
    it('returns clean text unchanged', () => {
      expect(cleanText('Friendly bartender')).toBe('Friendly bartender');
    });

    it('handles empty string', () => {
      expect(cleanText('')).toBe('');
    });
  });

  describe('validateContent', () => {
    it('returns null for clean text', () => {
      expect(validateContent('Dale Cooper', 'name')).toBeNull();
    });

    it('returns null for empty text', () => {
      expect(validateContent('', 'name')).toBeNull();
    });
  });
});
