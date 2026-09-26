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

**For SBP phase 1, set up real rules tests.** The Firestore emulator needs
Java (not installed as of this writing); with it, use
`@firebase/rules-unit-testing`. SBP's rules will be more involved than these,
and the whole team-only model rests on them.

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
| `sbp-characters/{id}` | one character | cast, admin | owner (cast) + admin |

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
1. **Data layer.** Set up the rules emulator + tests first (§3). `isCast()`-gated `sbp-rules` + `sbp-characters` rules; the
   admin upload with validation and history; seed both files.
2. **Derivation layer.** Pure functions: rules + choices → character at level
   N. Tested against synthetic fixtures. No UI.
3. **Wizard**, level 1. Species → background → class → archetype (if entry
   level 1) → ability scores → choices → name → save.
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

## 8. Open questions for Luke

1. **Ability score method** — standard array, point buy, rolled, or a choice?
   Not specified in the data.
2. **Level down** — discard choices above the new level, or keep them dormant
   for when the character levels back up?
3. **Visibility** — can the crew see each other's characters (like "The Party"),
   or only their own?
4. **Look** — SBP's theme is dark cereal-punk
   (`src/themes/soggyBottomPirates.theme.ts`); the platform is paper/notebook.
   Do Labs pages wear SBP's look or the platform's?
5. **`$open_decisions`** — especially background/class name collisions and
   fixed vs. flexible ability increases. Needed before the wizard's
   background step is final.

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
