import type { MonsterBuilderConfig } from './types';
import { appearancePool, habitatPool, behaviorPool, weaknessPool, pickOptions } from './optionPools';

/**
 * Live Monster Builder — Episode Three (September 19, 2026).
 *
 * Same slot structure as Episodes One and Two, fresh episode-scoped showId
 * so Firestore data doesn't bleed across shows.
 *
 * Options: half rotated back from Episode One (two shows out, per the pool
 * rotation rule), half brand-new (added Aug 2026) — including the local
 * flavor picks (This Very Bar, The Orange Groves).
 */
export const motWEp3Config: MonsterBuilderConfig = {
  showId: 'monster-of-the-week-2026-09-19',
  showName: 'Monster of the Week — Episode Three',

  slots: [
    {
      id: 'appearance',
      label: 'What does it look like?',
      revealPrefix: 'It appears as',
      allowWriteIn: true,
      options: pickOptions(appearancePool, [
        'Living Shadow',
        'Stolen Faces',
        'All Teeth',
        'Dripping Wet',
        'Static-Faced',
        'Patchwork',
      ]),
    },
    {
      id: 'habitat',
      label: 'Where has it been seen?',
      revealPrefix: 'It lurks in',
      allowWriteIn: true,
      options: pickOptions(habitatPool, [
        'Deep Woods',
        'Your Walls',
        'Holy Ground',
        'This Very Bar',
        'The Radio Tower',
        'The Orange Groves',
      ]),
    },
    {
      id: 'behavior',
      label: 'How does it hunt?',
      revealPrefix: 'When it hunts, it',
      allowWriteIn: true,
      options: pickOptions(behaviorPool, [
        'Whispers Names',
        'Never Blinks',
        'Sings First',
        'Steals Sleep',
        'Answers Prayers',
        'Follows the Rules',
      ]),
    },
    {
      id: 'weakness',
      label: "What's the only way to stop it?",
      revealPrefix: 'The only way to stop it:',
      allowWriteIn: true,
      secret: true,
      options: pickOptions(weaknessPool, [
        'True Name',
        'Salt Circle',
        'First Light',
        'Laughter',
        'A Fair Trade',
        'Bury It',
      ]),
    },
  ],

  bystander: {
    openPrompt: 'Give us a bystander — someone the monster will cross paths with tonight.',
    movePresets: [
      { label: 'Try to help the hunters', text: 'Try to help the hunters' },
      { label: 'Get in the way',          text: 'Get in the way' },
      { label: 'Reveal something',        text: 'Reveal something' },
      { label: 'Freak out in terror',     text: 'Freak out in terror' },
    ],
  },
};
