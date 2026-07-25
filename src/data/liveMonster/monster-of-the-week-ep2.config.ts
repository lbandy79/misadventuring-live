import type { MonsterBuilderConfig } from './types';
import { appearancePool, habitatPool, behaviorPool, weaknessPool, pickOptions } from './optionPools';

/**
 * Live Monster Builder — Episode Two (July 25, 2026).
 *
 * Continuing the story from Episode One (June 27). Same slot structure,
 * fresh episode-scoped showId so Firestore data doesn't bleed across shows.
 *
 * Options are pulled from the shared pools in optionPools.ts — every pick
 * below is new for this episode (Episode One's six per slot sit in the same
 * pools, tagged with their date, ready to rotate back in later).
 */
export const motWEp2Config: MonsterBuilderConfig = {
  showId: 'monster-of-the-week-2026-07-25',
  showName: 'Monster of the Week — Episode Two',

  slots: [
    {
      id: 'appearance',
      label: 'What does it look like?',
      revealPrefix: 'It appears as',
      allowWriteIn: true,
      options: pickOptions(appearancePool, [
        'Beautiful',
        'Child-Sized',
        'Antlered',
        'Made of Rot',
        'Bone Thin',
        'Grinning Wide',
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
        'The High School',
        'Storm Drains',
        'The Old Motel',
      ]),
    },
    {
      id: 'behavior',
      label: 'How does it hunt?',
      revealPrefix: 'When it hunts, it',
      allowWriteIn: true,
      options: pickOptions(behaviorPool, [
        'Mimics Voices',
        'Collects Trophies',
        'Waits by Roads',
        'Feeds on Fear',
        'Marks Its Prey',
        'Knocks Twice',
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
        'A Lullaby',
        'Silver',
        'Its Own Kind',
        'An Honest Gift',
        'Starve It',
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
