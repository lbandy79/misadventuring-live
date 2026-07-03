# MTP App — Claude Code Reference

## Repository layout

```
misadventuring-live-starter/
├── platform/          # Audience-facing React app (Vite + Firebase)
│   ├── src/
│   │   ├── pages/     # Route-level components (NpcCreationPage, MadLibsDisplayPage, …)
│   │   ├── components/ # Shared components (Doodle, NpcCard, StingerPrompt, …)
│   │   ├── styles/    # Global token layer (paper.css)
│   │   └── index.css  # Platform shell + all shared class definitions
│   └── index.html     # Google Fonts loaded here (Bowlby One, Kalam, Permanent Marker, Caveat, Special Elite)
├── src/               # Shared library (Firebase, show configs, system JSON, image assets)
│   ├── images/Your paragraph text/   # Decorative PNG doodles (bear, bees, stars, …)
│   ├── systems/       # Per-show system JSON (honey-heist.system.json, …)
│   ├── lib/           # npcApi, audienceApi, composeWords, show types
│   └── firebase.ts
└── docs/              # Architecture docs and text audits
```

The `platform/` app imports from `src/` using relative paths (`../../../src/…`). This is intentional — `src/` is the shared monorepo library.

---

## Design system

### Notebook aesthetic

The entire platform uses a **pen-and-paper / marginalia aesthetic**. The token layer lives in [platform/src/styles/paper.css](platform/src/styles/paper.css).

Key tokens:
- `--ink-black`, `--ink-blue`, `--ink-red` — ink colors
- `--paper`, `--paper-warm`, `--paper-line`, `--paper-margin` — paper surface colors
- `--font-display` (Bowlby One), `--font-marker` (Permanent Marker), `--font-hand` (Kalam), `--font-script` (Caveat), `--font-type` (Special Elite)
- `--tape` — golden masking tape color used on card decorations
- `--accent` / `--accent-ink` / `--accent-soft` — per-show color slot (see below)

Utility classes in paper.css: `.paper-bg`, `.paper-card`, `.tape-strip`, `.scribble-underline`, `.typewriter-label`, `.rec-badge`, `.tilt-l`, `.tilt-r`

### Per-show accent color

Pages override `--accent` and `--accent-ink` via inline style on the outermost wrapper:

```tsx
const accentStyle = {
  '--accent': showConfig.theme.accentColor,   // e.g. '#e0a022' for Honey Heist
  '--accent-ink': show?.accentInk ?? 'var(--ink-black)',
} as Record<string, string>;

<section className="page-card join-page" style={accentStyle} data-show={showId}>
```

`--accent-soft` is derived automatically via `color-mix(in srgb, var(--accent) 18%, transparent)` — do not override it manually.

The `data-show` attribute on the wrapper makes CSS targeting available for show-specific overrides without a separate file:
```css
[data-show="mad-libs-honey-heist"] { … }
```

---

## Doodle component

**File:** [platform/src/components/Doodle.tsx](platform/src/components/Doodle.tsx)

Renders a decorative PNG absolutely positioned within the nearest `position: relative` ancestor. All images are imported from `src/images/Your paragraph text/` and registered in a typed map.

```tsx
<Doodle name="bear" top="-24px" right="-28px" rotation={15} opacity={0.8} width="112px" />
```

Props: `name` (typed union), `top/bottom/left/right` (CSS strings), `rotation` (degrees), `opacity` (0–1), `scale` (multiplier), `width` (CSS string, default `'100px'`).

**Rules:**
- Parent must have `position: relative` — `page-card` already does.
- Doodles are `aria-hidden` and `pointer-events: none` — never use them for anything interactive.
- Hidden automatically on `max-width: 600px` — no JS required.
- Place doodles as the first children inside the section so they render behind content (`z-index: 0`).

Available images: `bear`, `bear_face`, `blue_bear`, `bees`, `diamonds`, `stars`, `shine`, `squiggle`, `tape`, `light_bulb`, `nat1_dice`, `nat20_dice`, `arcade`, `cereal`, `shipwreck`

To add a new image: drop it in `src/images/Your paragraph text/`, add an import and a key to the `IMAGES` map in `Doodle.tsx`. The `DoodleName` type union expands automatically.

---

## Show system

Each show has two config sources:

| Source | Path | Purpose |
|---|---|---|
| Show definition | `src/lib/shows/*.show.ts` | `id`, `name`, `themeId`, `accentColor`, `accentInk`, `status` |
| System JSON | `src/systems/*.system.json` | NPC fields, stinger queue, word banks, reveal templates |

The system JSON is loaded dynamically at runtime: `` import(`../../../src/systems/${show.systemId}.system.json`) ``

### Honey Heist specifics
- Show ID: `mad-libs-honey-heist`
- Firestore show ID (in system JSON): `honey-heist-madlibs-2026-05-23`
- Accent: `#e0a022` (honey gold) / `#1c1c1c` (dark ink)
- Flow: blind Mad Libs collection → reveal → persistent NPC view → stinger overlay

---

## Show lifecycle checklist

### After every show

1. **Flip `config/platform.currentShowId` in Firestore** to the new episode's showId (e.g. `monster-of-the-week-2026-07-25`). Do this on show day before doors open. Flip it back to `idle` or the next show's id after the show ends.

2. **Add a recap config entry** in [platform/src/pages/recap/recapConfig.ts](platform/src/pages/recap/recapConfig.ts):
   - Set `showId` to the episode id (same value used in Firestore — must match exactly)
   - Set `monsterStatus: 'available'` for MotW shows (pulls live monster + bystanders automatically)
   - Set `monsterStatus: 'lost'` if the builder wasn't run or data is gone
   - Fill in `fullEpisodeYoutubeId` once the recording is live
   - Set `next` to point at the upcoming show

3. **Archive the show** in [src/lib/shows/<series>.show.ts](src/lib/shows/):
   - Change `era` to `'past'` once it has aired and the next show's file is in place
   - Update `nextDate` on the active show to the new date

4. **Update LandingPage constants** in [platform/src/pages/LandingPage.tsx](platform/src/pages/LandingPage.tsx):
   - `LATEST_RECAP` → new show name + YouTube URL
   - `NEXT_SHOW` → next show name + date label + href

### Before each MotW show specifically

5. **New episode config** — copy `src/data/liveMonster/monster-of-the-week-ep2.config.ts`, increment the episode number and `showId` to match the new date, register in `src/data/liveMonster/index.ts`.

---

## Responsive breakpoints

| px | Usage |
|---|---|
| 600 | Doodles hidden below this |
| 560 | Brand wordmark appears; show grid goes multi-column |
| 640 | `page-card` padding increases; steps grid goes multi-column |
| 720 | Header padding increases; platform-main padding increases |

Mobile-first: base styles target narrow viewports, media queries add features for wider ones.

---

## What not to do

- Do not add `overflow: hidden` to `.page-card` — it clips absolutely-positioned doodles.
- Do not hardcode `--accent-soft` — it is computed from `--accent` via `color-mix()`.
- Do not put doodles outside their phase's `<section>` — each phase returns independently.
- Do not use the old dark-theme CSS variables (`--bg-primary`, `--accent` from `src/index.css`) in platform pages — the platform has its own token layer in `paper.css`.
