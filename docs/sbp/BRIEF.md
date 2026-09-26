# SBP Labs — Pre-production Brief

**Status:** pre-production · Step 0 done · **Written:** 2026-09-26 · **Owner:** Luke

Handoff for the session that builds the Soggy Bottom Pirates character wizard.
Read all of it before writing code. Section 3 is non-negotiable.

> This repo is **public**. This brief deliberately contains architecture only —
> no rules text, no class/species/feat names. Keep it that way. See §3.

---

## 1. What we're building

A **team-only living sourcebook** for Soggy Bottom Pirates, inside the platform
site, used while the system is being playtested. Three parts, in this order:

1. **Character wizard + character sheets** ← this build
2. Rules reference (browse the sourcebook) — later
3. Random tables — later (content doesn't exist yet)

**Who uses it:** the MotW crew — the same people on the cast allowlist, maybe a
new cast member or two. Nobody else. Not the audience, not the public.

**What the wizard must do:**

- Build a character from the rules data: species → background → class →
  archetype (at the right level) → ability scores → choices → name
- Serve **both** quick playtest builds and the real characters the crew plays
- Let a player own and track **multiple** characters
- Move a character **up and down levels** without hassle — level changes
  recompute everything, and choices made at higher levels are kept or
  discarded predictably

SBP is **its own d20 system**, not a 5e conversion (the data files say so
explicitly). Don't reach for 5e assumptions the data doesn't state.

---

## 2. Decisions already made

| Decision | Choice |
|---|---|
| Where it lives | `platform/` — not `berry-bay-companion` (separate GM-prep app, own repo) and not a new app |
| Who can get in | Cast allowlist, `config/cast.emails` (reuse, don't duplicate) |
| First deliverable | Character creation, then sheets with level up/down |
| Route namespace (proposed) | `/labs/sbp/...` — "Misadventuring Labs" is Luke's own term from the data files |
| Rules data home | Firestore, loaded after sign-in. Never the repo, never the bundle |

---

## 3. Security model — non-negotiable

Three facts drive everything:

1. **The GitHub repo is public.** Anything committed is published.
2. **The JS bundle is public.** Anything `import`ed into `platform/` ships to
   every visitor, signed in or not. A sign-in gate on a *route* does not
   protect content compiled into the bundle.
3. **Page-level checks are not access control.** Only Firestore security rules
   are.

Therefore:

- **Never commit** `sbp_classes.json`, `sbp_origins.json`, or any future rules
  file. Not in `src/`, not in `public/`, not in `docs/`, not as fixtures. Tests
  use small synthetic data.
- **Never `import`** rules data into app code. Fetch it from Firestore after
  sign-in.
- **Every SBP collection** is readable only by cast or admin, enforced in
  `firestore.rules`.

### Step 0 — rules hardening ✅ done 2026-09-26

Pre-existing gaps in `firestore.rules`, found during pre-production. Fixed,
deployed, and verified before any SBP work. **Don't redo these** — build on
them.

1. ✅ **`config/{docId}` catch-all now excludes `cast`.** Firestore grants
   access if *any* matching rule allows it, so the catch-all was overriding the
   cast allowlist's admin-only rule. Any new `config/*` doc with its own rule
   must be added to that exclusion list too — the rule's comment says so.
2. ✅ **`isCast()` helper added**, mirroring `isAdmin()`.
3. ✅ **`hasVerifiedEmail()` gates both `isAdmin()` and `isCast()`** — an
   unverified token can claim any email. Google sign-in always sets it.
   **All SBP rules must use `isCast()` / `isAdmin()`, never `isSignedIn()`:**
   audience join pages sign visitors in anonymously, and anonymous users count
   as signed in.
4. ✅ **`hunter-sheets` read/create/update → `isCast() || isAdmin()`.** Was
   `isSignedIn()`. Verified with a live probe: an anonymous user could read
   sheets before the deploy and gets `permission-denied` after.
5. ⏸ **Deferred: hiding `config/cast` from public reads.** It exposes team
   emails, but `AuthProvider` subscribes to it once on page load, before
   sign-in resolves. Locking reads would kill that listener and silently drop
   cast access. Needs `AuthProvider` to resubscribe when the user changes
   first — `src/lib/auth/AuthProvider.tsx`.

Deploying rules is `firebase deploy --only firestore:rules` — Luke approves it.
`firebase deploy --only firestore:rules --dry-run` compiles without deploying.
Never test by writing to production.

**Rules tests exist as of phase 1** — `npm run test:rules` starts the
Firestore emulator (needs a JDK; Temurin 21 is installed on the dev machine)
and runs `src/test/rules/**` via `vitest.rules.config.ts`. They are excluded
from `npm test` on purpose. They cover every SBP collection with the full
identity matrix (signed out, anonymous, verified outsider, unverified
impostor claiming a cast email, cast, admin) plus regression checks for the
Step 0 fixes. Add a case there for every new rule. Note the library is
pinned to `@firebase/rules-unit-testing@3` — it's the release that peers on
`firebase@10`, which this repo uses.

---

## 4. The data

### Source files

Source of truth lives **outside the repo** (currently `~/Downloads/`, will move
to the SBP OneDrive folder):

| File | Contents |
|---|---|
| `sbp_classes.json` | 8 classes, each levels 1–20 with features; 27 archetypes; shared spell-slot tables |
| `sbp_origins.json` | 9 species, 8 backgrounds, 16 feats (8 origin, 8 species-flavored) |

Both are ~106 KB combined, max nesting depth 9, no arrays-in-arrays, no dotted
keys — **each stores as a single Firestore document with no transformation**
(limit is 1 MiB). All cross-references between the two files resolve (checked
2026-09-26).

> `sbp_classes.json`'s `$doc` says only one class is built. That's stale —
> all 8 are complete.

### Conventions to honor

Both files carry a `$conventions` block. Read it; the wizard is its intended
consumer. The load-bearing ones:

- **Reference by id, never display name.** Ids are namespaced (`class.*`,
  `species.*`, `background.*`, `feat.*`, `archetype.*`).
- **`levels[]` references features by id**; feature bodies live once in
  `class.features`.
- **`archetype.entry_level` vs `first_feature_level`** — the choice and its
  first payoff can land at different levels. Prompt at `entry_level`.
- **`grants` is machine-readable; `text` is what the player reads.** The wizard
  applies grants and displays text. Don't parse prose.
- **`uses: {count, recharge}`** — `count` may be `"proficiency_bonus"`;
  recompute on level change.
- **`formula` / `unlock_level`** — level-dependent values; re-evaluate on level
  change.
- **Species feats are not level-1 grants** — they're options at `asi_or_feat`
  levels, gated by species prerequisite.
- **`playtest`, `maturity`, `swap` flags** — see §7.

### Known gaps

- **Spells file doesn't exist.** Three caster classes reference spell lists by
  id. The wizard must handle "list referenced, not loaded" gracefully — show
  slots and counts, mark spell selection as pending.
- **Random tables** don't exist yet (§1 part 3).
- **`sbp_origins.json` → `$open_decisions`** (6 items). Two affect wizard UI:
  background/class name collisions, and fixed vs. flexible background ability
  increases. Build so these resolve as **data changes, not code changes**.

### Registry fix

`src/lib/shows/soggy-bottom-pirates.show.ts` has `systemId: 'dnd-5e'`, and
`src/systems/dnd-5e.system.json` is an explicit placeholder. SBP needs its own
system id. Low priority for the wizard itself, but don't build on `dnd-5e`.

---

## 5. Architecture (proposed — confirm before building)

### Firestore

| Collection / doc | Holds | Read | Write |
|---|---|---|---|
| `sbp-rules/classes` | `sbp_classes.json` verbatim | cast, admin | admin |
| `sbp-rules/origins` | `sbp_origins.json` verbatim | cast, admin | admin |
| `sbp-rules-history/{ts}` | previous version on every upload | admin | admin |
| `sbp-characters/{id}` | one character | cast, admin | owner (cast) + admin; owner may also delete (playtest builds are disposable — decided 2026-09-26) |

### Getting rules data in: admin upload

A tab in `/admin`: pick a JSON file → validate → preview diff → write. On
write, copy the current doc to `sbp-rules-history` first (same never-lose-
anything philosophy as `src/lib/archive`).

Validation before any write: schema version present, the cross-reference check
(every `origin_feat`, `species_feats[]`, feat species prerequisite,
`archetype.choices_ref`, `collides_with` resolves), and a count summary. Reject
on any unresolved reference.

This means rebalancing after a playtest is: edit the file, upload. No code
change, no deploy, no promote.

### Character model: store choices, derive everything else

Save **what the player chose**, never computed stats:

```
{ ownerUid, ownerEmail, name, level,
  speciesId, backgroundId, classId, archetypeId,
  abilityScores: { method, base },          // before bonuses
  choices: { [level]: { asiOrFeat, skills, tools, ... } },
  rulesVersion,                              // which upload it was built against
  createdAt, updatedAt }
```

Everything else — HP, proficiency bonus, features, uses, slots, save DCs — is
**computed** from choices + rules data. Level up adds the next level's choice
slots; level down hides choices above the new level (keep or discard is a
product decision — see §8). Store `rulesVersion` so a rules upload doesn't
silently change a character; surface "rules updated since this was built."

The derivation layer should be pure functions with no Firebase dependency, so
it unit-tests cleanly. `src/lib/liveMonster/visibleBystanders.ts` is the
pattern: domain rule in `src/lib/`, type-only imports, tested in `src/test/lib/`.

### Routes

| Route | Page |
|---|---|
| `/labs/sbp` | my characters |
| `/labs/sbp/characters/new` | wizard |
| `/labs/sbp/characters/:id` | sheet, with level up/down |
| later `/labs/sbp/rules`, `/labs/sbp/tables` | sourcebook, tables |

Nav link visible only to `isCast || isAdmin`, same as "The Party"
(`platform/src/App.tsx`).

### Reuse, don't rebuild

The MotW hunter system solved this shape of problem in June 2026:

| Need | Existing |
|---|---|
| Cast sign-in + `isCast` | `src/lib/auth/AuthProvider.tsx` |
| Cast list management | `platform/src/components/admin/CastAdminPanel.tsx` |
| Multi-step wizard | `platform/src/pages/HunterCreationPage.tsx` |
| Party/portfolio page | `platform/src/pages/HuntersPage.tsx` |
| Firestore CRUD | `src/lib/hunters/hunterApi.ts` |

Learn from `HunterCreationPage` — it's 1,759 lines in one file. The SBP wizard
should split steps into components from the start.

---

## 6. Build order

Each phase ships and is verified before the next starts.

0. ~~**Rules hardening** (§3 Step 0).~~ ✅ Done 2026-09-26.
1. ✅ **Data layer** — live 2026-09-26: rules + indexes deployed, both
   files seeded through /admin, live probe confirms outsiders are denied.
   Rules for `sbp-rules`, `sbp-rules-history`, `sbp-characters`
   (`firestore.rules`, tested in `src/test/rules/sbp.rules.test.ts`);
   `src/lib/sbp/` (`types.ts`, `validateRules.ts`, `rulesApi.ts`); the
   "SBP Labs — rules data" panel in `/admin`
   (`platform/src/components/admin/SbpRulesAdminPanel.tsx`). Rules docs are
   `{ meta, data }` — `data` is the file verbatim, `meta.uploadedAt` is the
   version token characters will record. Upload + history archive happen in
   one transaction. Seeding is done by Luke through the panel, never by
   script. To go live: `firebase deploy --only firestore:rules` (and
   `--only firestore:indexes` for the history query), then promote the
   platform build.
2. ✅ **Derivation layer** — built 2026-09-26, `src/lib/sbp/`:
   - `character.ts` — stored shape + `setLevel` / `clearChoicesAbove` /
     `withChoices`. **Every level-gated choice lives under its level in
     `choices[level]`** (archetype at `entry_level`, ASI-or-feat at each
     `asi_or_feat` level, class skills / species size / background tools /
     flexible background ASI at level 1). Derivation reads only levels ≤
     current, which is what makes level-down "dormant" for free. This
     supersedes the top-level `archetypeId` sketched in §5.
   - `derive.ts` — `deriveCharacter(character, {classes, origins})` →
     abilities, PB, HP (fixed average: die + CON at 1st, die/2+1 + CON per
     level), saves/skills/tools/armor/weapons, speed, size, features with
     resolved `uses` and evaluated `formula`, spellcasting numbers with
     `listLoaded: false`, `levelExtras` (e.g. per-level dice on a row),
     `otherGrants` for the sheet, **`pendingChoices`** (what the rules ask
     for at ≤ current level that isn't chosen — drives the wizard and the
     sheet), `dormantLevels`, `rulesOutdated`, and `issues` instead of
     throwing.
   - `abilityScores.ts` — standard array / point buy / rolled. Numbers
     default in code but an optional `$ability_scores` block in the origins
     file overrides them.
   - `formula.ts` — safe evaluator for `level`, `proficiency_bonus`, ability
     modifiers, `+ - * /` and parentheses. Returns null, never throws.
   - Tests: `src/test/lib/sbp/` against `fixtures.ts` (synthetic).
3. ✅ **Wizard**, level 1 — built 2026-09-26. `/labs/sbp/characters/new`
   (`platform/src/pages/labs/SbpCharacterWizardPage.tsx`), one component
   per step in `platform/src/components/sbp/wizard/`: species → background
   → class (+ archetype when `entry_level` is 1) → ability scores (method
   picker) → picks (class skills, size, tools, flexible increase — rendered
   from the data) → name + review → save. "Next" is enabled when
   `deriveCharacter` reports nothing pending for that step. Shared pieces
   in `platform/src/components/sbp/`: `SbpPage` (paper + SBP accent +
   `useSbpGate` cast gate), `useSbpRules`, `OptionCard`, `ContentFlags`
   (playtest/maturity badges; `swap` never rendered), `DerivedSummary`.
   `src/lib/sbp/characterApi.ts` is the Firestore CRUD. `/labs/sbp`
   (`SbpLabsPage.tsx`) lists your own characters with a compact derived
   summary and delete; the nav shows "Labs" to cast/admin.
4. **Sheet** + **level up/down**.
5. **My characters** page + nav link.
6. Later: rules browser, random tables, spells when the file exists.

---

## 7. Content flags the UI should respect

- **`playtest: {status, note, flagged}`** — show to the team. This is a
  playtest tool; "this is under evaluation" is useful information, not noise.
- **`maturity: 'core' | 'draft' | 'confirmed'`** — consider hiding or badging
  `draft` content.
- **`swap: {risk, note}`** — IP rename tracking. Internal only; never render
  on any public surface. It's a reason SBP content stays out of the public
  repo, not just the rules.

---

## 8. Open questions — answered 2026-09-26

1. **Ability score method** — **player picks** per character: standard array,
   point buy, or rolled. Standard array is the default for quick playtest
   builds. The character records `abilityScores.method`. Array values and
   point-buy costs live in the rules data, not code.
2. **Level down** — **keep choices dormant.** Choices above the current level
   are hidden and excluded from derivation, and reappear on level-up. The
   sheet offers an explicit "clear choices above this level" action for
   deliberate discards.
3. **Visibility** — **all cast read, owner edits.** Same model as
   `hunter-sheets` / "The Party": any cast member can view any character;
   only the owner (or an admin) can change it.
4. **Look** — **platform paper + SBP accent.** Paper tokens, SBP's
   `accentColor`/`accentInk`, `data-show="soggy-bottom-pirates"` on the
   wrapper for show-specific overrides. No second token layer.
5. **`$open_decisions`**
   - Background/class name collisions — **Luke renames backgrounds first**
     (option b: world-grounded origins). The wizard reads `collides_with`
     only to show an informational note; it never blocks a pairing. The
     rename is a data upload, not a code change.
   - Background ability increases — **support both modes, data decides.**
     `ability_score_increase.mode` is already in the data (`"fixed"`
     today). A `"flexible"` background lists three abilities and the player
     spreads +2/+1 or +1/+1/+1. The wizard branches on `mode`.
   - The other four (`background_starting_equipment`, `tigris_species_feat`,
     `honeykin_bastion_mismatch`, `background_languages`) are content
     decisions that resolve as data uploads; no wizard dependency.

---

## 9. Repo landmines

- **Two Vercel projects deploy from `master`.** Platform builds are *staged* —
  Luke promotes manually; a green build is not a live site. The legacy root
  app auto-deploys to production and breaks on dead code under `src/`. Run
  **both** `npm run build` and `npm run build:platform` before pushing.
- **Pre-existing failures:** `tsc --noEmit` reports 32 errors, `npm test` 18
  failures (legacy reservation specs). Diff against a clean tree
  (`git stash`) before blaming your change. Vitest doesn't typecheck — run
  tsc too.
- **Tests** only run from `src/**/*.test.{ts,tsx}` — not `platform/`.
- **Line endings are mixed** (CRLF + LF). String replacements assuming `\n`
  silently no-op.
- **`dist/` is partially tracked.** Don't `rm -rf dist`.
- **No python** on the dev machine; use node.
- **Verify deploys by fetching the live bundle** and searching for a string
  unique to your change. That same technique is why §3 exists.
