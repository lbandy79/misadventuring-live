import { describe, it, expect } from 'vitest';
import { mockSystemConfig } from '../fixtures/systemConfig';
import type { SystemConfig, NpcFormField, Stat } from '../../types/system.types';

describe('System Config structure', () => {
  const config = mockSystemConfig;

  describe('system identity', () => {
    it('has correct system id and name', () => {
      expect(config.system.id).toBe('kids-on-bikes-2e');
      expect(config.system.name).toBe('Kids on Bikes');
    });
  });

  describe('stats', () => {
    it('has exactly 6 stats', () => {
      expect(config.stats).toHaveLength(6);
    });

    it('each stat has id, name, description, and likelyVerbs', () => {
      config.stats.forEach((stat: Stat) => {
        expect(stat.id).toBeTruthy();
        expect(stat.name).toBeTruthy();
        expect(stat.description).toBeTruthy();
        expect(stat.likelyVerbs.length).toBeGreaterThan(0);
      });
    });

    it('stat ids are unique', () => {
      const ids = config.stats.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('dice', () => {
    it('has 6 dice types from d4 to d20', () => {
      expect(config.dice.available).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);
    });

    it('each die has a description', () => {
      config.dice.available.forEach(die => {
        expect(config.dice.descriptions[die]).toBeTruthy();
      });
    });
  });

  describe('npcCreator', () => {
    it('has at least 4 form fields', () => {
      expect(config.npcCreator.fields.length).toBeGreaterThanOrEqual(4);
    });

    it('each field has id, label, type, and required', () => {
      config.npcCreator.fields.forEach((field: NpcFormField) => {
        expect(field.id).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(['text', 'textarea', 'select']).toContain(field.type);
        expect(typeof field.required).toBe('boolean');
      });
    });

    it('field IDs are unique', () => {
      const ids = config.npcCreator.fields.map(f => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('stat select fields reference optionsFrom: stats', () => {
      const statFields = config.npcCreator.fields.filter(f => f.type === 'select');
      statFields.forEach(f => {
        expect(f.optionsFrom).toBe('stats');
      });
    });

    it('worstStat has mustDifferFrom:bestStat validation', () => {
      const worstStat = config.npcCreator.fields.find(f => f.id === 'worstStat');
      expect(worstStat).toBeDefined();
      expect(worstStat!.validation).toBe('mustDifferFrom:bestStat');
    });

    it('statAssignment has best, worst, and remaining', () => {
      const { statAssignment } = config.npcCreator;
      expect(statAssignment.best).toBeTruthy();
      expect(statAssignment.worst).toBeTruthy();
      expect(statAssignment.remaining).toBeTruthy();
    });
  });

  describe('showConfig', () => {
    it('has a showId', () => {
      expect(config.showConfig.showId).toBe('betawave-last-call-2026-04-18');
    });

    it('has series info', () => {
      expect(config.showConfig.seriesName).toBe('The Betawave Tapes');
      expect(config.showConfig.tapeNumber).toBe(1);
    });

    it('has setting with era, location, coreLocation', () => {
      const { setting } = config.showConfig;
      expect(setting.era).toBe('1991');
      expect(setting.location).toBeTruthy();
      expect(setting.coreLocation).toBeTruthy();
    });

    it('has npcCreatorOverrides with occupation suggestions', () => {
      const overrides = config.showConfig.npcCreatorOverrides;
      expect(overrides.occupationSuggestions.length).toBeGreaterThan(0);
      expect(overrides.secretPrompt).toBeTruthy();
    });
  });
});

describe('SystemConfig type completeness', () => {
  it('mock config satisfies SystemConfig interface', () => {
    // If this compiles, the type is satisfied
    const config: SystemConfig = mockSystemConfig;
    expect(config).toBeDefined();
  });
});
