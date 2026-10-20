import type { MonsterBuilderConfig } from './types';
import { appearancePool, habitatPool, behaviorPool, weaknessPool, pickOptions } from './optionPools';

/**
 * Live Monster Builder — Episode Four (October 24, 2026, Halloween show).
 *
 * Same slot structure as Episodes One–Three, fresh episode-scoped showId
 * so Firestore data doesn't bleed across shows.
 *
 * Options: Episode Two picks (two shows out) plus the Episode One picks that
 * did NOT re-run in Episode Three, leaning toward the most Halloween-flavored
 * entries (Knocks Twice, Wears Faces, The Graveyard). Every Aug 2026 addition
 * ran in Episode Three, so none are eligible yet.
 */
export const motWEp4Config: MonsterBuilderConfig = {
  showId: 'monster-of-the-week-2026-10-24',
  showName: 'Monster of the Week — Episode Four',

  slots: [
    {
      id: 'appearance',
      label: 'What does it look like?',
      revealPrefix: 'It appears as',
      allowWriteIn: true,
      options: pickOptions(appearancePool, [
        'Child-Sized',
        'Antlered',
        'Made of Rot',
        'Grinning Wide',
        'Wrong Skin',
        'Almost Human',
      ]),
    },
    {
      id: 'habitat',
      label: 'Where has it been seen?',
      revealPrefix: 'It lurks in',
      allowWriteIn: true,
      options: pickOptions(habitatPool, [
        'The County Fair',
        'The Graveyard',
        'The Dead Mall',
        'The Old Motel',
        'Empty Houses',
        'The Underneath',
      ]),
    },
    {
      id: 'behavior',
      label: 'How does it hunt?',
      revealPrefix: 'When it hunts, it',
      allowWriteIn: true,
      options: pickOptions(behaviorPool, [
        'Wears Faces',
        'Knocks Twice',
        'Mimics Voices',
        'Feeds on Fear',
        'Collects Trophies',
        'Snuffs Light',
      ]),
    },
    {
      id: 'weakness',
      label: "What's the only way to stop it?",
      revealPrefix: 'The only way to stop it:',
      allowWriteIn: true,
      secret: true,
      options: pickOptions(weaknessPool, [
        'Cold Iron',
        'Silver',
        'A Lullaby',
        'An Honest Gift',
        'Its Reflection',
        'Burn It',
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
