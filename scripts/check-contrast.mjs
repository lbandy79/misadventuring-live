#!/usr/bin/env node
/**
 * WCAG 2.1 AA contrast gate for the GM spotlight and projector themes.
 *
 *   npm run check:contrast
 *
 * Reads token values straight from the CSS (so it can't drift from what
 * ships) and checks every foreground/background pair the pages use:
 * 4.5:1 for text, 3:1 for large display text and UI boundaries/focus.
 * Exits 1 on any failure.
 *
 * Theme sets checked:
 *   spotlight default  — :where(.wis-root) in WriteInSpotlightPage.css
 *   every season       — [data-season='<id>'] in platform/src/styles/seasons/<id>.css
 * The projector's flag-off defaults are the original pre-theme colors and
 * are intentionally not gated (that's the rollback look); seasons are.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/** Collect `--name: #hex` declarations from the first block whose selector matches. */
function tokens(css, selectorPattern) {
  const block = css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`No block matching ${selectorPattern}`);
  return Object.fromEntries(
    [...block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
  );
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const LARGE = 3; // ≥24px, or ≥18.66px bold
const UI = 3;

// [foreground, background, minimum, what it is]
const SPOTLIGHT_PAIRS = [
  ['season-text', 'season-bg', TEXT, 'write-in text on page'],
  ['season-text', 'season-surface', TEXT, 'rail / bar text'],
  ['season-text', 'season-surface-2', TEXT, 'rail item / button text'],
  ['season-text-muted', 'season-bg', TEXT, 'prompt + lead-in'],
  ['season-text-muted', 'season-surface', TEXT, 'counts, group titles'],
  ['season-text-muted', 'season-surface-2', TEXT, 'used items'],
  ['season-accent-text', 'season-accent', TEXT, 'Next / active chip label'],
  ['season-accent', 'season-surface', TEXT, 'pinned tag, links'],
  ['season-accent', 'season-surface-2', TEXT, 'pinned tag on rail item'],
  ['season-danger', 'season-surface', TEXT, 'Hide label'],
  ['season-danger', 'season-surface-2', TEXT, 'Hide label on button'],
  ['season-danger-text', 'season-danger', TEXT, 'armed Hide label'],
  ['season-reveal', 'season-bg', TEXT, 'Reveal label / tag'],
  ['season-reveal', 'season-surface', TEXT, 'Revealed tag in rail'],
  ['season-reveal', 'season-surface-2', TEXT, 'Revealed tag on rail item'],
  ['season-reveal-text', 'season-reveal', TEXT, 'armed Reveal label'],
  ['season-focus', 'season-bg', UI, 'focus ring'],
  ['season-focus', 'season-surface', UI, 'focus ring in rail/bar'],
  ['season-border', 'season-surface', UI, 'button/chip boundary'],
  ['season-border', 'season-bg', UI, 'chip boundary on page'],
];

const PROJECTOR_PAIRS = [
  ['lmd-text', 'lmd-bg', TEXT, 'main text'],
  ['lmd-text', 'lmd-surface', TEXT, 'locked card value'],
  ['lmd-text-soft', 'lmd-bg', TEXT, 'bar labels, prefixes'],
  ['lmd-text-soft', 'lmd-surface', TEXT, 'stack prefix on card'],
  ['lmd-text-muted', 'lmd-bg', TEXT, 'counts, strip prefixes'],
  ['lmd-text-muted', 'lmd-surface', TEXT, 'strip prefix on locked row'],
  ['lmd-text-faint', 'lmd-bg', TEXT, 'URL, "pending", waiting label'],
  ['lmd-text', 'lmd-surface-hot-2', TEXT, 'locked banner text'],
  ['lmd-accent', 'lmd-bg', TEXT, 'titles, labels, names'],
  ['lmd-accent', 'lmd-surface-hot', TEXT, 'avatar fallback initial'],
  ['lmd-accent', 'lmd-surface', UI, 'locked card edge'],
  ['lmd-border', 'lmd-bg', 1.3, 'decorative divider (not required)'],
];

let failures = 0;
function check(label, set, pairs) {
  console.log(`\n${label}`);
  for (const [fg, bg, min, what] of pairs) {
    if (!set[fg] || !set[bg]) {
      console.log(`  MISSING  --${fg} / --${bg}`);
      failures++;
      continue;
    }
    const r = ratio(set[fg], set[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${r.toFixed(2).padStart(5)} ≥ ${min}  --${fg} on --${bg}  (${what})`);
  }
}

const spotlightCss = read('platform/src/pages/WriteInSpotlightPage.css');
check('Spotlight — default', tokens(spotlightCss, ':where\\(\\.wis-root\\)'), SPOTLIGHT_PAIRS);

const seasonDir = 'platform/src/styles/seasons';
for (const file of readdirSync(join(root, seasonDir)).filter((f) => f.endsWith('.css'))) {
  const id = file.replace(/\.css$/, '');
  const set = tokens(read(join(seasonDir, file)), `\\[data-season=['"]${id}['"]\\]`);
  check(`Spotlight — season "${id}"`, set, SPOTLIGHT_PAIRS);
  check(`Projector — season "${id}"`, set, PROJECTOR_PAIRS);
}

console.log(failures ? `\n${failures} contrast failure(s).` : '\nAll pairs pass WCAG 2.1 AA.');
process.exit(failures ? 1 : 0);
