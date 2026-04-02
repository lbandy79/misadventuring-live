/**
 * Test fixture: minimal Kids on Bikes 2E system config.
 * Trimmed to essential fields for fast, focused tests.
 */
import type { SystemConfig } from '../../types/system.types';

export const mockSystemConfig: SystemConfig = {
  system: {
    id: 'kids-on-bikes-2e',
    name: 'Kids on Bikes',
    edition: 'Second Edition',
    publisher: 'Hunters Entertainment',
    description: 'Everyday people encountering strange forces.',
  },
  stats: [
    { id: 'brains', name: 'Brains', description: 'Book-smart.', likelyVerbs: ['calculate', 'solve'] },
    { id: 'brawn', name: 'Brawn', description: 'Brute strength.', likelyVerbs: ['climb', 'lift'] },
    { id: 'fight', name: 'Fight', description: 'Intimidation.', likelyVerbs: ['intimidate', 'punch'] },
    { id: 'flight', name: 'Flight', description: 'Speed and evasion.', likelyVerbs: ['dodge', 'escape'] },
    { id: 'charm', name: 'Charm', description: 'Social skills.', likelyVerbs: ['persuade', 'lie'] },
    { id: 'grit', name: 'Grit', description: 'Toughness.', likelyVerbs: ['endure', 'resist'] },
  ],
  dice: {
    available: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
    descriptions: {
      d20: 'Superb',
      d12: 'Impressive',
      d10: 'Above Average',
      d8: 'Below Average',
      d6: 'Bad',
      d4: 'Terrible',
    },
  },
  ageGroups: [
    {
      id: 'adult',
      name: 'Adults',
      statBonuses: {},
      freeStrength: '',
      description: 'Grown-ups.',
    },
  ],
  tropes: [
    {
      id: 'loner',
      name: 'Loner Weirdo',
      allowedAges: ['teen', 'adult'],
      statAssignment: { brains: 'd20', fight: 'd12' },
      suggestedStrengths: ['intuitive'],
      suggestedFlaws: ['outsider'],
      questions: ['Why do you keep to yourself?'],
    },
  ],
  strengths: [
    { id: 'intuitive', name: 'Intuitive', description: 'Good gut feelings.', atCost: 0, alwaysActive: true },
  ],
  flaws: [
    { id: 'outsider', name: 'Outsider' },
  ],
  statChecks: {
    difficultyScale: [
      { range: [1, 4], label: 'Easy', description: 'Simple task.' },
      { range: [5, 9], label: 'Moderate', description: 'Average difficulty.' },
    ],
    luckyBreak: 'On a nat-20, something extraordinary happens.',
    adversityTokens: {
      startingAmount: 1,
      earnedOnFailure: 1,
      spendToBoostRoll: '+1 per token spent',
      canHelpAllies: true,
      canIgnoreFear: 'Spend 3 tokens to ignore fear',
    },
  },
  npcCreator: {
    fields: [
      { id: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Character name', maxLength: 40 },
      { id: 'occupation', label: 'Occupation', type: 'text', required: true, placeholder: 'What they do', maxLength: 60 },
      { id: 'appearance', label: 'Appearance', type: 'textarea', required: true, placeholder: 'What they look like', maxLength: 200, helpText: 'One or two sentences.' },
      { id: 'secret', label: 'Secret', type: 'textarea', required: true, placeholder: 'A hidden truth', maxLength: 300, helpText: 'Something hidden.' },
      { id: 'bestStat', label: 'Best Stat', type: 'select', required: true, optionsFrom: 'stats', helpText: 'What they excel at.' },
      { id: 'worstStat', label: 'Worst Stat', type: 'select', required: true, optionsFrom: 'stats', helpText: 'What they struggle with.', validation: 'mustDifferFrom:bestStat' },
    ],
    statAssignment: {
      best: 'd20',
      worst: 'd4',
      remaining: 'd12/d10/d8/d6 distributed by GM',
    },
  },
  showConfig: {
    showId: 'betawave-last-call-2026-04-18',
    showName: 'The Betawave Tapes: Last Call',
    seriesName: 'The Betawave Tapes',
    tapeNumber: 1,
    setting: {
      era: '1991',
      location: 'Winter Garden, FL',
      coreLocation: 'Lucky Straws',
    },
    npcCreatorOverrides: {
      occupationSuggestions: ['Bartender', 'Mechanic', 'Nurse', 'Teacher'],
      secretPrompt: 'What does your character not want anyone to know?',
    },
  },
};

export const mockReservation = {
  id: 'res-001',
  name: 'Test User',
  email: 'test@example.com',
  accessCode: 'ABC123',
  createdAt: Date.now(),
  npcCreated: false,
  showId: 'betawave-last-call-2026-04-18',
};

export const mockNPC = {
  id: 'npc-001',
  reservationId: 'res-001',
  showId: 'betawave-last-call-2026-04-18',
  systemId: 'kids-on-bikes-2e',
  name: 'Dale Cooper',
  occupation: 'Bartender',
  appearance: 'Tall guy with a mullet and a denim jacket.',
  secret: 'Sleepwalks into the woods every full moon.',
  bestStat: 'charm',
  worstStat: 'brains',
  createdAt: Date.now(),
  gmNotes: '',
  gmFlagged: false,
};
