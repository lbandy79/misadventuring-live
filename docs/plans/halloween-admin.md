# Halloween Admin Upgrade — MotW Ep4

**Show:** Saturday Oct 24, 2026 · Lucky Straws · Monster of the Week Ep4
**Code freeze:** Thursday Oct 22, ~9pm · **Friday Oct 23:** testing only
**Status:** Approved Oct 19, 2026 · Phases 0–1 in production Oct 21 (`f8ab3dd`) · Reveal-from-spotlight added Oct 21

## Goals

1. **Admin write-ins read like a teleprompter.** The GM reads audience write-ins aloud from a touch tablet on stage.
2. **Halloween theme** on the admin spotlight and the projector, built as a reusable seasonal token set.

## Decisions already made

| Question | Decision |
|---|---|
| Which write-ins? | Live Monster slot write-ins (`live-monster-slot-votes` with `optionIndex: null`) |
| Submitter names? | **No.** Phone flow untouched. Spotlight shows the slot prompt, not a submitter |
| GM device | **Tablet, touch only.** Big tap targets first; keyboard shortcuts as a bonus |
| Theme scope | **Admin + projector only.** Audience phone page visually untouched |
| Ep4 config | In scope as Phase 0. Luke picks/approves options; Claude wires it and tags Ep3 pool usage |
| Where `/admin` runs on show night | **Same tablet, second tab.** So the spotlight gets its own two-tap Reveal (Oct 21); phase changes stay on `/admin` |

## Hard constraints

- WCAG 2.1 AA: contrast verified by script, full keyboard operability, all animation gated behind `prefers-reduced-motion`.
- Do not break the audience submission flow (`/live-monster` on phones).
- No live Firestore writes, `currentShowId` flips, pushes, or deploys without asking Luke first.
- Small, reviewable changes. Anything that can't make Thursday's freeze gets cut (see cut order).

---

## Calendar and checkpoints

| Day | Work | Checkpoint |
|---|---|---|
| Mon 19 – Tue 20 | Phase 0: show safety + Ep4 | **A (Tue night):** `build` + `build:platform` green; Luke approves Ep4 options |
| Tue 20 – Wed 21 | Phase 1: spotlight | **B (Wed night):** Luke drives the spotlight on the actual tablet |
| Thu 22 | Phase 2: seasonal theme | **C (~9pm freeze):** push to master (with Luke's OK); Luke promotes the platform deploy in Vercel |
| Fri 23 | Testing only | **D:** go/no-go; reset Ep4 to clean idle |

---

## Phase 0 — Show safety (never cut)

1. **Fix the hook-order crash** in `platform/src/components/admin/LiveMonsterAdminPanel.tsx`: the `useMemo` for `typeSuggestions` runs *after* the `if (!config) return` early return. Flipping `currentShowId` with the admin open throws "Rendered more hooks than during the previous render". Move hooks above the early return.
2. **Phase pips → real `<button>`s** in the same file. They are `<span role="button">` today and only respond to Enter. Space should work too, with a visible focus ring.
3. **Ep4 config:**
   - Tag Ep3's picks in `src/data/liveMonster/optionPools.ts` first. Ep3 usage was never recorded.
   - Create `src/data/liveMonster/monster-of-the-week-ep4.config.ts` with `showId: 'monster-of-the-week-2026-10-24'`, copied from Ep3.
   - Claude proposes candidate picks Tuesday; Luke approves.
   - Register it in `src/data/liveMonster/index.ts`.

## Phase 1 — Spotlight teleprompter

### Firestore schema change (additive, no migration)

One new optional field on the existing admin-write-only doc `live-monster-session/{showId}`:

```ts
writeInStates?: Record<string /* slot-vote doc id */, {
  text: string;                         // snapshot of the write-in when triaged
  status: 'pending' | 'used' | 'hidden';
  pinned?: boolean;
  updatedAt: Timestamp;
}>;
```

- **No migration.** Existing sessions lack the field, so it's treated as `{}`.
- **No rules change.** The session doc is already `allow write: if isAdmin()`.
- **Reset already wipes it.** `resetMonsterSession` uses a non-merge `setDoc`, and `archiveMonsterShowData` already snapshots the whole session.
- **Stale detection.** Re-voting overwrites the same vote doc, so a write-in's text can change after triage. If the current `writeIn` doesn't match the stored `text`, the item comes back as pending with an "edited" tag.
- **Write with `FieldPath`, not dot-strings.** Vote ids contain `anon:<uuid>`.
- Recap pages are unaffected; they read `slotResults` only.

### Files

| File | Change |
|---|---|
| `src/lib/liveMonster/liveMonsterApi.ts` | Add `WriteInState` type, `writeInStates` on `MonsterSession`, `setWriteInState(showId, voteId, patch)` |
| `src/lib/liveMonster/writeInQueue.ts` | **New.** Pure functions: votes + states → queue (filter write-ins, stale check, group by slot, newest first, counts, pinned list) |
| `src/lib/liveMonster/writeInQueue.test.ts` | **New.** Vitest for ordering, grouping, stale/edited, hidden/used filtering |
| `platform/src/pages/WriteInSpotlightPage.tsx` + `.css` | **New.** `/admin/spotlight`, full-screen, admin-gated (same `useAuth` checks as `AdminPage`) |
| `platform/src/components/spotlight/SpotlightCard.tsx` | **New.** Prompt label (`revealPrefix`), then the write-in at 40–56px (floor 32px), scaling down by length up to 120 chars |
| `platform/src/components/spotlight/QueueRail.tsx` | **New.** Pending write-ins grouped by slot, newest first, per-slot + total counts, slot filter chips. Used items stay visible but dimmed |
| `platform/src/components/spotlight/ActionBar.tsx` | **New.** Fixed bottom bar: Prev · Next · Pin · Used · Hide. Buttons ≥56px tall; Hide placed away from Next and needs a confirm tap |
| `platform/src/components/spotlight/PinnedTray.tsx` | **New.** Drawer of pinned write-ins for callbacks |
| `platform/src/components/spotlight/UndoToast.tsx` | **New.** 10-second undo for any triage action |
| `platform/src/App.tsx` | Register `/admin/spotlight`; add it to the chromeless `isDisplay` regex |
| `platform/src/components/admin/LiveMonsterAdminPanel.tsx` | "Open spotlight ↗" link; read-only Hidden/Used badges on write-in rows so a hidden write-in is never revealed by accident |

### Behaviour

- **The spotlight never jumps on its own.** New arrivals show a "N new" pill; Next advances to the next pending item in rail order, skipping used/hidden.
- Keyboard: `→`/`Space` next · `←` previous · `P` pin · `U` used · `H` hide (then confirm) · `R` reveal (then confirm) · `Z` undo · `Esc` closes the drawer/disarms. All buttons are reachable by Tab with a visible focus ring.
- Spotlight changes are announced via `aria-live="polite"`.
- Screen Wake Lock (`navigator.wakeLock`) while the page is open, where the browser supports it.
- **Reveal from the spotlight (added Oct 21).** The GM runs `/admin` as a second tab on the same tablet, so the reveal moment shouldn't need a tab switch.
  - A **Reveal this** button on the card calls the same `setSlotResult` as `/admin`. It appears only when `/admin` would allow it: phase is `reveal`, the slot has no locked result, and the item isn't hidden (`canRevealWriteIn` in `writeInQueue.ts`).
  - **Two taps** (or `R` twice), with a 4-second arm window. Moving to another write-in disarms it. There's no undo, because `/admin` has no un-reveal either.
  - Its own colour (`--season-reveal`, teal), never Next's amber.
  - A **Revealed** tag (rail) / **On the projector** tag (card) marks the write-in whose text matches its slot's `slotResults`. If the voter changes their answer after the reveal, the tag correctly disappears; the projector keeps its copy.
  - Phase changes, bystanders and Reset stay on `/admin`.

## Phase 2 — Seasonal theme (admin spotlight + projector only)

### Files

| File | Change |
|---|---|
| `platform/src/styles/seasons/seasons.config.ts` | **New.** `ACTIVE_SEASON: 'halloween' \| null` |
| `platform/src/styles/seasons/useSeason.ts` | **New.** Returns the active season; `?season=none` URL override (runtime kill switch) |
| `platform/src/styles/seasons/halloween.css` | **New.** Token values under `[data-season="halloween"]` |
| `platform/src/components/SeasonDecor.tsx` | **New.** Original inline-SVG art (cobweb corners, bats, moon) |
| `platform/src/pages/LiveMonsterDisplayPage.css` | Hardcoded hex → `var(--lmd-*, #original)` so flag-off looks the same as today |
| `platform/src/pages/LiveMonsterDisplayPage.tsx` | `data-season` on root; `<SeasonDecor>` in corners |
| `scripts/check-contrast.mjs` | **New.** Node script: computes WCAG ratios for every token pair; fails under 4.5:1 (text) / 3:1 (UI, focus) |
| `platform/src/components/admin/LiveMonsterAdminPanel.css` | **Admin contrast pass.** Colour-only fixes; no layout or season theming |

### Token contract

`--season-bg`, `--season-surface`, `--season-text`, `--season-text-muted`, `--season-accent`, `--season-accent-text`, `--season-danger`, `--season-focus`.

The spotlight CSS consumes these from day one, with neutral dark defaults. The projector maps `--lmd-*` to them. **A future season = one new CSS file + one config line.**

### Rules

- `data-season` goes only on the spotlight and display roots, never on `<html>`/`<body>`, so the audience phone page *cannot* inherit it.
- Decorations stay in corners and chrome only: `aria-hidden`, `pointer-events: none`, never behind readable text, never inside the QR code's quiet zone.
- Original artwork only; no third-party IP.
- Decor motion lives inside `@media (prefers-reduced-motion: no-preference)`. A blanket reduced-motion rule also covers the display's 19 existing animations.
- This also fixes contrast the display already fails (e.g. `#666` on `#0d0d14` ≈ 3.4:1).

### Admin panel contrast pass

The existing `/admin` Live Monster panel is the spotlight's fallback, so it has to meet AA too. Its CSS was written for a dark background but renders on cream paper. Measured in the browser on Oct 20, 2026:

| Element | Colour | Ratio | Needs |
|---|---|---|---|
| `.lm-gm-token-value` (the revealed monster traits) | `#e0c97f` | **1.61:1** | 4.5:1 |
| `.lm-phase-pip` (inactive phase buttons) | `#888` | 3.48:1 | 4.5:1 |
| `.lm-gm-token-prefix` | `#888` | 3.48:1 | 4.5:1 |
| `.lm-show-badge` | `#888` | 3.48:1 | 4.5:1 |

Fix by swapping to existing paper tokens (`--ink-black`, `--ink-blue`, or `#666`-or-darker greys) and re-measure. Also audit the remaining `rgba(255 255 255 / …)` backgrounds and `--color-text-muted` fallbacks in the same file. Colour-only change: no layout, no season theming.

---

## Test plan

### Automated (every change)

- `npx vitest run src/lib/liveMonster/writeInQueue.test.ts`
- `node scripts/check-contrast.mjs`
- `npm run build` **and** `npm run build:platform`. The legacy app compiles `src/lib`, and it auto-deploys to production.
- `tsc` and the full test suite: compare against the pre-existing baseline (32 tsc errors, 18 test failures in legacy specs). There should be no new ones.

### Local (Wed/Thu)

- Dev server on the LAN (`npm run dev:platform -- --host`), phones on the same network.
- A **dev-only** `?show=<id>` override in `ShowProvider`, guarded by `import.meta.env.DEV` and stripped from production builds, points at the demo showId without flipping `currentShowId`.
- ⚠ This still writes demo-show vote docs to live Firestore. **Ask Luke before the first write.**

### Friday — end to end on real phones

At minimum one iPhone (Safari) and one Android (Chrome), on cellular, plus 3–5 more devices:

1. Scan the QR, join `/live-monster`. Phone page looks unchanged.
2. Submit a preset in one slot and a write-in in every slot.
3. Write-ins appear on the tablet spotlight within ~2s, grouped under the right prompt.
4. Triage each: next, prev, pin, used (stays dimmed), hide (confirm), undo.
5. Edge cases:
   - Re-vote edit → item returns as pending with "edited"
   - 120-character write-in still ≥32px and fits
   - Emoji
   - Profanity attempt (blocked on the phone)
6. Hidden write-in shows a Hidden badge in `/admin`.
7. In the `reveal` phase, reveal one write-in from the **spotlight** (two taps) and another from `/admin`. The projector shows both in Halloween theme; the spotlight tags both "Revealed", and the Reveal button disappears for those slots.
8. `?season=none` on the display → original look.
9. Reduce Motion on (iOS setting) → no decor/display animation.
10. Tablet Wi-Fi off, then on → spotlight recovers, queued triage writes land.
11. Google sign-in works on the tablet browser.

⚠ Friday testing needs `config/platform.currentShowId` = `monster-of-the-week-2026-10-24`. **Ask Luke before flipping it.**

### Friday — dry run of a full segment

- ~15 minutes, Luke reading from the tablet: idle → active → reveal → bystanders → done, with 20+ write-ins from several people.
- Time it; note any moment the GM looked away from the spotlight to find something.
- Afterwards: **Reset Ep4** (backup snapshot written to `archives/…`). Confirm session is idle with zero votes before doors.

### Show-day checklist additions

- Tablet signed into Google on `/admin/spotlight` before doors
- Auto-lock off, landscape locked, on a charger, on hotspot if venue Wi-Fi is shaky
- `/admin` open in a second tab as the fallback
- Projector at `/live-monster/display`; know the `?season=none` URL

---

## Risks and rollback

| Risk | Mitigation / rollback |
|---|---|
| Spotlight misbehaves mid-show | `/admin` panel is unchanged. Switch tabs; no deploy needed |
| Theme breaks or hurts readability on the projector | Add `?season=none` to the display URL. Otherwise set `ACTIVE_SEASON = null` and redeploy, or promote the previous Vercel deploy |
| Legacy app (auto-deploys) breaks on a shared `src/` change | Run `npm run build` before every push; confirm the `misadventuring-live` production deploy is READY |
| Platform fix "pushed" but not live | Platform deploys are staged; **Luke must promote** in the Vercel dashboard |
| Re-vote changes text after triage | Text snapshot + "edited" tag (Phase 1) |
| Accidental reveal from the spotlight (public, no undo) | Two taps with a 4s arm window, distinct teal colour, disarms on navigation. Only offered when `/admin` would offer it |
| `currentShowId` flip crashes admin | Fixed in Phase 0 |
| Venue Wi-Fi | Tablet on hotspot; Firestore queues writes offline |
| Vote collections are world-writable (`if true`) | Accepted for Saturday; schedule a rules hardening after the show |

## Cut order (first to go)

1. Decor animation (static art stays)
2. Wake Lock (rely on the "auto-lock off" checklist item)
3. Projector retokenizing (display keeps today's look; spotlight still themed)
4. Admin panel contrast pass (fallback panel keeps today's colours; the spotlight is the primary reading surface and is AA on its own)
5. Single-key shortcuts (buttons stay fully keyboard-operable, so AA holds)
6. Slot filter chips (group headers stay)
7. Pinned drawer (pins become a rail filter)

**Never cut:** Phase 0; spotlight card, Next, Used, Hide, queue rail.

**Status Oct 21:** items 2, 5, 6 and 7 are already built and in production with Phase 1, so the remaining cut order applies to Phase 2 (items 1, 3, 4). Reveal-from-spotlight can be pulled by removing the button if Friday testing finds a problem; `/admin` reveal is the fallback.

## Out of scope (post-show)

- Bystander submissions in the spotlight
- Firestore rules hardening for `live-monster-slot-votes` / `live-bystander-submissions`
- Submitter names
