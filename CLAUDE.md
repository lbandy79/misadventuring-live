# TMP App — Claude Code Reference

Rules and reference for every Claude Code session in this repo. Read this first, every time.

## Golden rules

1. **Plan before multi-file changes.** Explain the plan and wait for approval before editing more than one file.
2. **Stay in scope.** Do not refactor, rename, or "clean up" code outside the task. Log it in `docs/ARCHITECTURE.md` under "Known mess" instead.
3. **One feature per branch.** Every change gets a Vercel preview deploy and gets checked there before merging.
4. **Show-day freeze.** No production deploys in the 48 hours before a live show except fixes Luke approves. Next show: Green Oaks, Nov 28, 2026.
5. **Build must pass.** Run the build before declaring anything done.
6. **Update the docs.** When a task changes structure, update this file or `docs/ARCHITECTURE.md` in the same branch.

## Commands

There is no `platform/package.json`. Everything runs from the **repo root** (one `package.json`, one `node_modules`).

- `npm run dev:platform` platform dev server (port 3001)
- `npm run build:platform` platform production build to `platform/dist` (must pass before any commit)
- `npm test` unit tests (Vitest). Baseline: 18 known failures, all legacy reservation tests. See `docs/ARCHITECTURE.md`.
- `npm run test:rules` Firestore rules tests against the emulator (needs the Firebase CLI)
- `npm run check:contrast` colour-contrast gate for theme/season tokens
- `npx tsc -p platform/tsconfig.json --noEmit` type check (no script yet; 21 pre-existing errors)
- No linter is installed. There is no lint command.
- `npm run dev` / `npm run build` are the **legacy** live app (Blade Runner), not the platform.

---

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

### Structure rules going forward

- **Firebase access lives only in `src/firebase.ts` and `src/lib/*Api.ts`.** Pages and components call those APIs. They never import Firebase SDKs directly.
- **New interaction features get a folder:** `platform/src/features/<feature-name>/` with `components/`, `hooks/`, and an `index.ts` that is the only file other code imports from. Existing pages move into this pattern gradually, one per session, never as a side effect.
- **Reference feature:** `platform/src/features/rumor-mill/` (Rumor Mill, Green Oaks) is the first one built this way. Copy its shape: `config.ts` reads the system JSON, `src/lib/rumors` holds the data access, rules tests in `src/test/rules/`.
- **Pages stay thin.** A page composes features and applies the show accent. Logic belongs in the feature or in `src/lib`.

---

## Live interaction features

The show system below is the spine for all audience interaction (NPC creator, stingers, Mad Libs, the Rumor Mill, and new ones like bingo). When adding a new interaction:

1. **Config goes in the show's system JSON** (bingo squares, rumor mill copy, word banks). Not hardcoded in components.
2. **Data access goes in `src/lib`** as a new `*Api.ts` or an extension of `audienceApi`.
3. **Every feature provides up to three views:** phone (audience), big screen (display page), and GM control.
4. **Moderation by default:** audience-written text never reaches the big screen until the GM approves it.
5. **Keys off `config/platform.currentShowId`** like everything else. Do not invent a parallel "active show" mechanism.

---

## The Misadventuring Labs (team tools)

Private team area at `/labs`, served from this same app. First tool: the Soggy Bottom Pirates character creator at `/labs/sbp`.

- **Routes:** `/labs/sbp` (`platform/src/pages/labs/SbpLabsPage.tsx`), `/labs/sbp/characters/new` and `/labs/sbp/characters/:id/edit` (`SbpCharacterWizardPage.tsx`), `/labs/sbp/characters/:id` (`SbpCharacterSheetPage.tsx`). `/labs` itself has no route yet.
- **UI:** `platform/src/components/sbp/` (`SbpPage.tsx` holds the `useSbpGate()` cast gate; `wizard/`, `spells/`, `art/`). Upload panels: `platform/src/components/admin/SbpRulesAdminPanel.tsx`, `SbpArtAdminPanel.tsx` on `/admin`.
- **Data + logic:** `src/lib/sbp/` (`rulesApi.ts`, `characterApi.ts`, `artApi.ts`, `validateRules.ts`, `derive.ts`, `types.ts`).
- **Firestore:** `sbp-rules`, `sbp-rules-history`, `sbp-art`, `sbp-art-full`, `sbp-art-history`, `sbp-characters`. Rules tests: `src/test/rules/sbp.rules.test.ts`.
- **Background:** `docs/sbp/BRIEF.md` (security model, read first), `docs/sbp/ROADMAP.md`.

- **Audience and team are different trust levels.** Labs is for the GM and cast only. Labs routes require auth, and Firestore rules must block audience users from reading or writing Labs data. A hidden URL is not access control.
- **Game data is uploaded JSON.** SBP classes and origins are updated by uploading JSON files. Validate uploads against a TypeScript type or schema before saving, and fail loudly with a readable error.
- **Labs tools follow the same structure rules** as audience features: `platform/src/features/<tool-name>/`, data access through `src/lib`.
- **Planned next for SBP:** spells, and art for classes, species, and backgrounds.
- **SBP terms:** currency is "bits". Backgrounds are named for where a character grew up (e.g. Frost Scrapper, Bay Runner), not class names.

---

## Security (non-negotiable)

Audience input is untrusted input from strangers.

- Render user text as text. Never use `dangerouslySetInnerHTML` or build HTML from user input.
- Enforce length limits in the UI, in `src/lib`, and in Firestore security rules.
- Firestore rules validate shape, types, and length on every audience-writable collection. Client-side validation alone does not count.
- Audience users can write only their own submissions. They can never write show state or `config/`.
- Rate-limit submissions per device or anonymous user.
- No secrets in client code. Anything in `VITE_` env vars is public.

## Accessibility (WCAG 2.1 AA minimum)

- Phone views: tap targets at least 44x44px, readable without zoom, work one-handed.
- Big-screen views: high contrast, large type, readable from the back of a room. Check the handwritten fonts (Kalam, Caveat) at distance; use `--font-display` or `--font-type` for anything that must be read quickly.
- Realtime updates use `aria-live="polite"`, never focus stealing.
- Respect `prefers-reduced-motion` (watch the `.tilt-*` and any animated reveals).
- Every interactive element is keyboard reachable with a visible focus state.
- Color is never the only signal (bingo marks, approved/rejected states, per-show accents).

## Copy

- TMP voice: warm, funny, short.
- No em dashes in user-facing copy.

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
- Do not import Firebase SDKs outside `src/firebase.ts` and `src/lib`.
- Do not render audience text with `dangerouslySetInnerHTML`.

---

## Audit (run once, before new feature work)

If `docs/ARCHITECTURE.md` does not exist or predates this file, do this before anything else, without changing any code:

1. Read the whole repo, including `docs/`.
2. Write `docs/ARCHITECTURE.md`: every route, every feature and where it lives, how each feature reaches Firebase, current Firestore security rules and their gaps, duplicated logic, dead code, and anything in this file that no longer matches reality. Cover the Labs area separately: its routes, how it is protected, how the SBP JSON uploads are validated, and whether any Labs data is reachable by audience users. Fill in the Labs paths in this file.
3. Add a "Known mess" section listing the 10 biggest problems ranked by risk, security first.
4. Propose a migration order, plus how Green Oaks (Rumor Mill, bingo, NPC creator) should be built on the existing show system.
5. Correct the Commands section of this file.
6. Stop and wait for Luke's review.
