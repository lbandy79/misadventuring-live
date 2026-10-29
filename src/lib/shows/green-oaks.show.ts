/**
 * Green Oaks — Show definition.
 *
 * Roberto de Luca's retirement-home RPG (MS Edizioni, CC BY-NC-SA 4.0).
 * Everyone plays a Senior: "Former ___, retired ___ with a ___ hobby."
 * Checks are card draws from a poker deck, not dice.
 *
 * November 28, 2026. Firestore episode id: `greenoaks-2026-11-28`.
 * No system JSON yet — ShowPage falls back to the title-cased systemId.
 */
import type { Show } from '../types/show.types';

export const greenOaksShow: Show = {
  id: 'green-oaks',
  name: 'Green Oaks',
  themeId: 'tmp-base',
  systemId: 'green-oaks',
  enabledInteractions: [],
  description:
    'Welcome to your new home. The residents of Green Oaks retirement community all have a past, and something is going on in the basement. The party plays the Seniors; the deck of cards decides how badly it goes.',
  era: 'upcoming',
  nextDate: '2026-11-28',
  venue: 'Lucky Straws, Winter Garden, FL',
  accentColor: '#00698f',
  accentInk: '#ffffff',
};
