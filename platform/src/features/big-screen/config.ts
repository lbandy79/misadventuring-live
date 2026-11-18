/** `showConfig.bigScreen` in a show's system JSON, with fallbacks. */

export interface BigScreenCopy {
  townieTitle: string;
  phoneTitle: string;
  phoneSubtitle: string;
  phoneOff: string;
  phoneLink: string;
}

const DEFAULT_COPY: BigScreenCopy = {
  townieTitle: "Who's here",
  phoneTitle: 'On the big screen',
  phoneSubtitle: 'Same as the screen up front, live.',
  phoneOff: 'Nothing on the big screen right now.',
  phoneLink: "See what's on the big screen →",
};

export function resolveBigScreenCopy(raw: Partial<BigScreenCopy> | undefined): BigScreenCopy {
  return { ...DEFAULT_COPY, ...(raw ?? {}) };
}
