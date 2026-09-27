# SBP Labs — Roadmap

**Started:** 2026-09-27 · **Owner:** Luke · Companion to [BRIEF.md](BRIEF.md)

Phases 0–5 of the brief are done: locked rules store with upload/history,
derivation, wizard, sheet with level up/down, crew view. This is what's
next. Same rules as the brief: **this repo is public** — no rules text, no
content names, no art in here. Everything in this list follows the §3
security model (Firestore behind `isCast()`/`isAdmin()`, loaded after
sign-in, never committed, never bundled).

Order is a suggestion; playtest feedback wins.

---

## 1. Draft art on classes, species, backgrounds  ✅ built 2026-09-27

**Decided: option A (Firestore).** Built as `sbp-art/{entityId}` (thumb +
meta, ~20–110 KB), `sbp-art-full/{entityId}` (≈1024 px WebP, < 700 KB,
fetched on demand and cached per upload), and `sbp-art-history` (append-only).
Rules and tests are in `firestore.rules` / `src/test/rules/sbp.rules.test.ts`.
Matching is in `src/lib/sbp/artMatch.ts` (tested); the admin panel is
`platform/src/components/admin/SbpArtAdminPanel.tsx`; display is in
`platform/src/components/sbp/art/` (one session-wide thumb subscription).
An entry with no art shows its description in a larger text box instead
(e.g. the species that has no draft image, by design).

Original plan, kept for reference:

Midjourney drafts, app-only, the blueprint an artist will later replace.
Source: OneDrive `Soggy Bottom Pirates/2026 Campaign/Player Packet Art/`
(`Classes/`, `Species/`, `Backgrounds/`), ~1–2 MB PNG each.

- **Storage (decision needed):**
  - **A. Firestore, recommended for drafts.** Admin panel shrinks each
    image in the browser (≈1024 px WebP, ~100–250 KB) and stores it as one
    doc per entity in `sbp-art/{entityId}`, with cast/admin read and admin
    write, the same rule shape as `sbp-rules`. No new service, no billing
    change, and the rules tests cover it.
  - **B. Firebase Storage.** Better for many or large images, but it needs
    the Storage bucket enabled (Blaze plan) plus `storage.rules`, and has to
    be fetched through the SDK (`getBlob`) because download URLs are bearer
    links that bypass the rules.
- **Matching:** by entity **id**, never file name. The upload panel
  auto-suggests matches by fuzzy name and lets you fix them by hand. Known
  mismatches today: a plural class file, two misspelled file names, and one
  species with no image.
- **Replaceable:** re-uploading an entity's art overwrites it, and history
  is kept like the rules. Each doc stores `status: 'draft' | 'final'`, so the
  artist's versions can be tracked against the drafts.
- **Where it shows:** wizard option cards (thumbnail), the detail panel on
  each step, the sheet header, and crew rows (small).
- Missing art degrades to the current text-only card.

## 2. Rules browser

`/labs/sbp/rules`. Read the sourcebook in the app: classes by level (with
archetypes), species, backgrounds, feats. Playtest/maturity badges
visible. Uses the rules docs already loaded; no new data. Draft art shows
here too once item 1 lands.

## 3. Spells

Blocked on a spells file. Four classes already reference spell lists; the
sheet shows slots and counts. To do:
- Agree a file shape (`spells[]` with id, level, list ids, text, grants) —
  reserve `sbp-rules/spells` (the validator already knows the kind).
- Validator cross-refs: every class `spell_list` resolves.
- Sheet: pick cantrips / known or prepared spells up to the derived counts;
  store picks per level in `choices` like everything else.

## 4. Random tables

Blocked on content. Likely a `tables` rules kind: roll on a table in-app,
optionally keep a log for the session.

## 5. World content: monsters, NPCs, ships, special items, and more

GM-side building blocks for the campaign. Same pattern for each:
- A data shape first, agreed before any UI (as the class/origin files were).
- **Open question per type:** authored as an uploaded file (like classes)
  or built in-app with a wizard (like the MotW Keeper tools in
  `/keeper`)? Rough guess: items and ships as files, and monsters and NPCs
  in-app, because they're made mid-prep.
- **Visibility per type:** crew-wide, or GM/admin-only until revealed?
  NPCs and monsters are probably admin-only with a "reveal to crew" flag.
- Derivation where it applies (ship stats, item bonuses feeding the sheet
  via `grants`).
- Art slot on each, same mechanism as item 1.

| Type | Likely source | Likely visibility | Notes |
|---|---|---|---|
| Monsters | in-app wizard | admin, reveal | stat blocks; reuse Keeper patterns |
| NPCs | in-app wizard | admin, reveal | may link to existing Berry Bay prep |
| Ships | file or wizard | crew | ship combat exists in the legacy app |
| Special items | file | crew | `grants` on the sheet when equipped |
| _(more as they come)_ | | | |

## Housekeeping

- Show registry says SBP is `systemId: 'dnd-5e'`; give SBP its own id
  before anything reads it (BRIEF §4).
- Deferred from Step 0: hide `config/cast` from public reads (needs
  `AuthProvider` to resubscribe on user change).
- Tidy old copies of the data files in OneDrive/Downloads so the stale ones
  aren't uploaded by accident.
