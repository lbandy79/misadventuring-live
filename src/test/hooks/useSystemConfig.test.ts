import { describe, it, expect } from 'vitest';
import { getStatById, getStatName } from '../../hooks/useSystemConfig';
import { mockSystemConfig } from '../fixtures/systemConfig';

describe('useSystemConfig helpers', () => {
  describe('getStatById', () => {
    it('returns the stat when found', () => {
      const stat = getStatById(mockSystemConfig, 'charm');
      expect(stat).toBeDefined();
      expect(stat!.name).toBe('Charm');
      expect(stat!.likelyVerbs).toContain('persuade');
    });

    it('returns undefined for unknown stat id', () => {
      expect(getStatById(mockSystemConfig, 'arcana')).toBeUndefined();
    });

    it('returns correct stat for each of the 6 KoB stats', () => {
      const ids = ['brains', 'brawn', 'fight', 'flight', 'charm', 'grit'];
      ids.forEach(id => {
        const stat = getStatById(mockSystemConfig, id);
        expect(stat).toBeDefined();
        expect(stat!.id).toBe(id);
      });
    });
  });

  describe('getStatName', () => {
    it('returns display name for a valid stat', () => {
      expect(getStatName(mockSystemConfig, 'brains')).toBe('Brains');
      expect(getStatName(mockSystemConfig, 'grit')).toBe('Grit');
    });

    it('falls back to the raw ID for unknown stats', () => {
      expect(getStatName(mockSystemConfig, 'stealth')).toBe('stealth');
    });
  });
});
