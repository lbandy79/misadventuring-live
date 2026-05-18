# Doodle System

**Status:** Proof-of-concept — live on Honey Heist (`NpcCreationPage`) only.  
**Implemented:** 2026-05-18  
**Next step:** Extend to `MadLibsDisplayPage` idle state and future show join pages.

---

## What it is

A single reusable `<Doodle>` component that places a decorative PNG image absolutely within a page section. Doodles compose with the existing notebook/marginalia aesthetic rather than replacing it — they're purely additive. They never carry content, never receive focus, and disappear on mobile automatically.

---

## Files

| File | Role |
|---|---|
| `platform/src/components/Doodle.tsx` | Component + typed image registry |
| `platform/src/components/Doodle.css` | Positioning rules + responsive hide |
| `platform/src/styles/paper.css` | Token layer — `--accent-soft` uses `color-mix()` |
| `src/images/Your paragraph text/` | Source PNGs |

---

## Image inventory

All images are PNGs, imported as ES modules (Vite handles hashing and bundling).

| Key | File | Best used for |
|---|---|---|
| `bear` | bear.png | Honey Heist — full bear body, peeking over edges |
| `bear_face` | bear_face.png | Honey Heist — just the face, smaller footprint |
| `blue_bear` | blue_bear.png | Honey Heist variant / sad bear moments |
| `bees` | bees.png | Honey Heist — scattered bees |
| `diamonds` | diamonds.png | General decorative sparkle |
| `stars` | stars.png | General — reveal moments, celebrations |
| `shine` | shine.png | General — highlight / magic |
| `squiggle` | squiggle.png | General — underliner, separator |
| `tape` | tape.png | General — paper tape strip |
| `light_bulb` | light_bulb.png | General — ideas, hints |
| `nat1_dice` | nat1_dice.png | TMP branding — "failing is fun" nat 1 |
| `nat20_dice` | nat20_dice.png | TMP branding — nat 20 |
| `arcade` | arcade.png | Retro / arcade-themed shows |
| `cereal` | cereal.png | Soggy Bottom Pirates |
| `shipwreck` | shipwreck.png | Soggy Bottom Pirates |

To add a new image: drop the PNG into `src/images/Your paragraph text/`, then add one import and one entry to the `IMAGES` map in `Doodle.tsx`. The `DoodleName` type expands automatically.

---

## Component API

```tsx
<Doodle
  name="bear"          // DoodleName — required
  top="-24px"          // CSS position — at least one of top/bottom, one of left/right
  right="-28px"
  rotation={15}        // degrees, default 0
  opacity={0.8}        // 0–1, default 0.85
  scale={1}            // multiplier, default 1
  width="112px"        // CSS width, default '100px'; height is auto
/>
```

---

## How to use it on a new page

1. The page's outermost wrapper must have `position: relative`. The `.page-card` class already provides this — use it.

2. Import the component:
   ```tsx
   import { Doodle } from '../components/Doodle';
   ```

3. Place Doodle instances as the first children inside the wrapper so they sit behind content (`z-index: 0`):
   ```tsx
   <section className="page-card join-page" style={accentStyle} data-show={showId}>
     <Doodle name="bear" top="-24px" right="-28px" rotation={15} opacity={0.8} width="112px" />
     <Doodle name="bees" bottom="72px" left="-20px" rotation={-8} opacity={0.6} width="76px" />
     {/* rest of page content */}
   </section>
   ```

4. Negative `top` / `right` / `left` / `bottom` values let doodles peek over the card edge. The default `overflow: visible` on `.page-card` allows this — do not add `overflow: hidden`.

5. Done. Mobile hides them automatically at `max-width: 600px`.

---

## Per-show accent color

Doodles work alongside the per-show accent system. Wire both together on the same wrapper:

```tsx
// Derive from showConfig (loaded from system JSON) + show object (from show registry)
const accentStyle = {
  '--accent': showConfig.theme.accentColor,
  '--accent-ink': show?.accentInk ?? 'var(--ink-black)',
} as Record<string, string>;

<section className="page-card" style={accentStyle} data-show={showId}>
  <Doodle … />
```

`--accent` cascades into buttons, field borders, radio accents, dividers, badges — anything that uses `var(--accent)` in `platform/src/index.css` or `paper.css`. No additional CSS required for the accent to apply.

`--accent-soft` (used for focus rings and soft tints) is computed automatically:
```css
--accent-soft: color-mix(in srgb, var(--accent) 18%, transparent);
```

---

## Honey Heist placements (reference)

| Phase | Doodle | Position | Rotation | Opacity | Width |
|---|---|---|---|---|---|
| Create form | `bear` | top: -24px, right: -28px | +15° | 0.80 | 112px |
| Create form | `bees` | bottom: 72px, left: -20px | -8° | 0.60 | 76px |
| Reveal | `shine` | top: -18px, right: -22px | +20° | 0.55 | 85px |
| Reveal | `stars` | bottom: 24px, left: -18px | -12° | 0.50 | 72px |
| You're in | `bear_face` | top: -22px, right: -24px | +10° | 0.75 | 92px |
| You're in | `squiggle` | bottom: 36px, left: -16px | -5° | 0.45 | 82px |

---

## Design principles

- **Enhance, don't replace.** Doodles sit on top of the notebook substrate. They never carry content and never compete with it.
- **Opacity matters.** Keep decorative doodles in the 0.4–0.85 range. Full opacity makes them look like UI elements.
- **Slight rotations feel hand-placed.** ±5–20° reads as "taped on." Beyond 30° reads as intentional tilt.
- **Asymmetric placement.** One doodle top-right, one bottom-left is the default composition. Avoid symmetry.
- **Mobile is doodle-free.** The 600px cutoff is intentional — phones need every pixel for content.
