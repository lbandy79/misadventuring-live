# TMP App: Architecture

Audit written 2026-11-05 against `master` @ `3cdbd96`, per the "Audit" section of `CLAUDE.md`.
No code was changed to produce it. Findings marked **(verified)** were checked by running something; the rest are from reading the code.

Baseline at audit time **(verified)**:

| Check | Result |
|---|---|
| `npm run build:platform` | passes (one chunk-size warning) |
| `npm test` | 276 pass, **18 fail**, all in 3 legacy reservation-flow test files (`AccessCodeEntry`, `NPCReviewPanel`, `NPCCreationFlow`) |
| `npx tsc --noEmit` (root) | 32 errors |
| `npx tsc -p platform/tsconfig.json --noEmit` | 21 errors |
| Lint | no linter is installed; there is no `lint` script |

---

## 1. What is in this repo

There are **two apps** in one repo, sharing `src/lib`, `src/data`, `src/systems` and one Firebase project.

| App | Entry | Build | Deploy | Status |
|---|---|---|---|---|
| **Platform** (the real site) | `platform/index.html` → `platform/src/main.tsx` → `platform/src/App.tsx` | `npm run build:platform` → `platform/dist` | Vercel project with Root Directory `platform/` (`platform/vercel.json`). Needs a **manual promote** to production. | Active. All new work goes here. |
| **Legacy live app** | `index.html` → `src/main.tsx` → `src/App.tsx` | `npm run build` → `dist/` | Vercel project at repo root (`vercel.json`). Auto-deploys. | Still used for the Blade Runner campaign. Everything else is dead weight. |

Other top-level pieces:

- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: Firestore config (emulator on port 8089).
- `functions/`: Cloud Functions for email via Resend (`sendEmail`, `sendNotebookBatch`). Not called by the platform today. The header of `firestore.rules` still says "there is NO Cloud Functions backend".
- `scripts/`: `check-contrast.mjs` (wired to `npm run check:contrast`), plus one-off backup and audit scripts.
- `docs/`: `doodle-system.md`, `honey-heist-text-audit.md`, `plans/halloween-admin.md`, `sbp/BRIEF.md` + `sbp/ROADMAP.md`, `game-prep/`, `archive/`.

---

## 2. Routes

### Platform (`platform/src/App.tsx`)

Gates below are client-side page checks. The real access control is the Firestore rule for the data the page reads (section 4).

| Route | Page | Who | Firestore it touches |
|---|---|---|---|
| `/` | `LandingPage` | public | none (constants in file) |
| `/shows` | `ShowsIndexPage` | public | none (show registry) |
| `/shows/:showId` | `ShowPage` | public | system JSON |
| `/shows/:showId/audience` | `AudiencePage` | public | via `@mtp/lib` |
| `/shows/:showId/join` | `NpcCreationPage` | public, anonymous auth | `npcs`, `npc-world-votes`, `beats`, `audience-profiles`, `magic-tokens` |
| `/join` | `JoinRedirectPage` | public | `config/platform` → forwards to current show's join page |
| `/shows/mad-libs-honey-heist/join` | redirect → `/join` | public | n/a |
| `/shows/:showId/recap`, `/recap/:showId` | `RecapPage` | public | `recapApi.ts`: `npcs`, `reservations`, live monster session + bystanders |
| `/shows/:showId/display` | `MadLibsDisplayPage` (no chrome) | projector | `npcs` (showOnDisplay), `beats` (approved), `world-selections`, mad-lib collections |
| `/live-monster` | `LiveMonsterAudiencePage` (no chrome) | public | `live-monster-session`, `live-monster-*-votes`, `live-bystander-submissions` |
| `/live-monster/display` | `LiveMonsterDisplayPage` (no chrome) | projector | same, read-only |
| `/admin/spotlight` | `WriteInSpotlightPage` (no chrome) | admin | write-in queue, bystanders |
| `/admin` | `AdminPage` + `components/admin/*` panels | admin | almost everything |
| `/shows/monster-of-the-week/create-hunter` | `HunterCreationPage` | cast | `hunter-sheets` |
| `/hunters` | `HuntersPage` | cast | `hunter-sheets` |
| `/labs/sbp/**` | see section 5 | cast | `sbp-*` |
| `/keeper`, `/keeper/{monsters,minions,bystanders,locations}/{new,:id,:id/edit}` | Keeper wizards + stat pages | admin | `keeper-threats` |
| `/return` | `ReturnPage` | public | `magic-tokens` |
| `/my-characters` | `MyCharactersPage` | public | `npcs` |
| `/my-bears`, `/companion`, `/notebook`, `/shows/:showId/notebook/:npcId` | redirects | n/a | n/a |
| `*` | `NotFoundPage` | n/a | n/a |

Unrouted page files (dead): `CompanionPage.tsx`, `MadLibsGatewayPage.tsx`, `MadLibsVotePage.tsx`, `ReservePage.tsx`. Nothing imports them.

### Legacy app (`src/App.tsx`)

`/` (AudienceView, or `?code=` → `/create`), `/create`, `/blade-runner/create`, `/blade-runner/roster`, `/blade-runner/play/:id`, `/monster-of-the-week/create`, `/play/:npcId`, `/player/:playerId`, `/admin` (Firebase Auth + allowlist since Phase 9A), `/display`, `/qr`.

Only the `/blade-runner/*` routes are known to be in use.

---

## 3. Features: where they live and how they reach Firebase

The rule in `CLAUDE.md` is "Firebase only in `src/firebase.ts` and `src/lib/*Api.ts`". Status per feature:

| Feature | UI | Data access | Follows the rule? |
|---|---|---|---|
| Show registry + current show | `src/lib/shows/*` | `ShowProvider.tsx` reads/writes `config/platform` | yes (a provider, not an `*Api.ts`, but inside `src/lib`) |
| NPC creator (Honey Heist, Green Oaks) | `platform/src/pages/NpcCreationPage.tsx` | `src/lib/npcs/npcApi.ts`, `src/lib/audience/audienceApi.ts` | **no**: page imports `firebase/auth` and `../../src/firebase` directly for anonymous sign-in |
| Stingers / beats | `StingerPrompt.tsx`, `NpcAdminPanel.tsx` | `npcApi.ts` | **no**: `NpcAdminPanel` imports `firebase/auth` |
| Mad Libs | `MadLibsDisplayPage`, `MadLibsAdminPanel` | `src/lib/madlibs/madLibsApi.ts` | yes |
| Live Monster Builder | `LiveMonster*Page`, `LiveMonsterAdminPanel`, `WriteInSpotlightPage` + `components/spotlight/*` | `src/lib/liveMonster/*` | yes |
| Recap | `platform/src/pages/recap/*` | `platform/src/pages/recap/recapApi.ts` | **no**: an API file living in `pages/`, importing `firebase/firestore` directly, still reading `reservations` |
| Audience email capture / return links | footer `NotifyForm` in `App.tsx`, `ReturnPage`, `AudienceAdminPanel` | `audienceApi.ts` | yes |
| MotW hunters | `HunterCreationPage`, `HuntersPage`, `CastAdminPanel` | `src/lib/hunters/hunterApi.ts` | yes |
| Keeper compendium | `KeeperPage` + 8 wizard/stat pages | `src/lib/threats/threatApi.ts` | yes |
| SBP Labs | section 5 | `src/lib/sbp/*Api.ts` | yes |
| Auth | `AuthMenu.tsx` | `src/lib/auth/AuthProvider.tsx` (`config/admins`, `config/cast`) | yes |
| Seasons (Halloween) | `styles/seasons/*`, `SeasonDecor` | none (code flag) | n/a |
| Legacy live app | `src/components/**`, `src/admin/**` | 30+ components import `firebase/firestore` directly | **no**, everywhere |
| Theme assets (legacy) | `src/themes/ThemeProvider.tsx` | reads `config/theme` directly | **no** |

No `platform/src/features/` folder exists yet. Every feature is organised by type (`pages/`, `components/admin/`, `components/sbp/`).

---

## 4. Firestore security rules and their gaps

Auth model: admin = Google-verified email in `config/admins.emails`; cast = same in `config/cast.emails`. Audience = anonymous Firebase Auth (join page) or no auth at all. **There is no rate limiting anywhere**, client or rules.

Only the SBP rules have emulator tests (`src/test/rules/sbp.rules.test.ts`, run with `npm run test:rules`). Nothing else in `firestore.rules` is tested.

### Locked down properly

`sbp-*` (cast read, admin write, append-only history, size caps), `keeper-threats` (admin only), `hunter-sheets` (cast, owner-write), `config/platform`, `config/cast`, `world-selections`, `live-monster-session` (admin write), `audience-profiles` (admin read; but see below for write).

### Gaps, worst first

1. **`npcs` update is effectively open.** The "owner" check is `deviceToken` unchanged, but `npcs` is `read: if true`, so every device token is public. Anyone can read a token and then rewrite any NPC: `displayName`, `fieldValues` (no length limits on update), `isActive`, and **`showOnDisplay: true`**, which is the flag the projector filters on. That is a straight path from an anonymous phone to the big screen with no GM approval. It also lets a submitter flip their own NPC onto the projector. Green Oaks townies use this collection.
2. **Audience PII is publicly listable.** `read: if true` allows list queries, not just single gets:
   - `npcs.email` (written by `saveNpcEmail`) is readable by anyone.
   - `magic-tokens` holds `{ email, npcs }` keyed by the return-link token. Listing the collection yields every email **and** every working return link. Writes are open to any anonymous user, so tokens can also be overwritten.
   - `reservations` (system removed in May) is still `read: if true` with `name`, `email`, `accessCode`.
3. **`npcs` email clause:** any client can set or overwrite `email` on any NPC (third `update` clause), with no format or length check.
4. **`config/{docId}` catch-all is world-writable** for every doc except `admins`, `platform`, `cast`. That includes `config/active-interaction` (drives the legacy display), `config/live-cues` (triggers sounds/effects) and `config/theme`.
5. **Mad Libs control docs are world-writable.** `mad-lib-locks` (close voting) and `mad-lib-active` (what segment phones show) say "admin gating is client-side". A phone can close voting or push a segment.
6. **`audience-profiles` is `write: if true`** with no shape validation. Anyone can create or overwrite any email's profile, including `optedIn*` flags and `npcs`.
7. **Audience-text collections have no shape or length validation in rules:** `beats` responses (no length cap on `response`), `live-bystander-submissions`, `npc-world-votes`, `mad-lib-votes`, `live-monster-*-votes`. Live Monster has a client-side `bad-words` filter (known to be evadable) and GM curation via `visibleBystanders`, which is the right model.
8. **Legacy collections are fully open:** `votes`, `group-roll`, `monster-builder`, `decoder-ring`, `ship-combat`, `villagers`, `players`, `blade-runner-characters`, `npcs-archive`, `archives/**`, `test/connection-test`. Anyone can delete Blade Runner sheets and archive snapshots.
9. **`config/admins` bootstrap:** `create: if isSignedIn()`. Harmless while the doc exists (delete is admin-only), but an anonymous user could claim admin on a fresh project or after an accidental delete.
10. **Stale justification:** the rules header says these collections stay open because "the legacy admin panel is still password-gated". It was moved to Firebase Auth in Phase 9A, so that reason no longer holds.

---

## 5. Misadventuring Labs

| Route | File | Data |
|---|---|---|
| `/labs/sbp` | `platform/src/pages/labs/SbpLabsPage.tsx` | `sbp-rules`, `sbp-characters`, `sbp-art` |
| `/labs/sbp/characters/new`, `/labs/sbp/characters/:id/edit` | `platform/src/pages/labs/SbpCharacterWizardPage.tsx` + `platform/src/components/sbp/wizard/*` | same |
| `/labs/sbp/characters/:id` | `platform/src/pages/labs/SbpCharacterSheetPage.tsx` | same |
| (upload UI) `/admin` → SBP panels | `platform/src/components/admin/SbpRulesAdminPanel.tsx`, `SbpArtAdminPanel.tsx` | writes `sbp-rules`, `sbp-rules-history`, `sbp-art*` |

- Shared UI: `platform/src/components/sbp/` (`SbpPage.tsx` holds the `useSbpGate()` cast gate, `useSbpRules.ts`, `pickers.tsx`, `spells/`, `art/`).
- Data access: `src/lib/sbp/` (`rulesApi.ts`, `characterApi.ts`, `artApi.ts`), pure logic in `derive.ts`, `formula.ts`, `abilityScores.ts`, `spells.ts`, types in `types.ts`.
- `/labs` itself has no route (404). The nav links straight to `/labs/sbp`.
- Labs tools do **not** yet follow the `platform/src/features/<tool>/` structure.

**Protection.** Pages call `useSbpGate()` and only subscribe to data when `user && (isCast || isAdmin)`. The real lock is `firestore.rules`: every `sbp-*` collection requires `isCast() || isAdmin()` with a verified Google email, so anonymous audience sessions fail. The rules content never ships in the repo or the bundle; it is loaded from Firestore after sign-in (`docs/sbp/BRIEF.md` §3).

**Upload validation.** `src/lib/sbp/validateRules.ts` detects the file kind, then validates classes, origins, spells and SRD spells against the TypeScript types, checks that every cross-reference resolves, and returns `error`/`warning` issues with paths. The admin panel shows the issues and a diff, and blocks upload on any error. The previous version is copied to append-only `sbp-rules-history` first. Rules only check the `{ meta, data }` envelope and `meta.uploadedBy`, so a malformed `data` written outside the panel by an admin would be accepted. That is acceptable for admin-only writes.

**Is any Labs data reachable by audience users?** No, as far as code and rules show. All `sbp-*` reads need a verified cast/admin email, and rules emulator tests cover anonymous, signed-out, non-cast and unverified-impostor sessions. Two things are **not** verified here: that the deployed rules match `firestore.rules`, and that `config/cast` contains only crew.

---

## 6. Duplicated logic

- **Two NPC APIs:** `src/lib/npcs/npcApi.ts` (platform) and `src/lib/reservations/npcsApi.ts` (legacy, reservation-era).
- **Two NPC creators:** `platform/src/pages/NpcCreationPage.tsx` and `src/components/NPCCreator/*`. Two MotW creators: `HunterCreationPage` and `src/components/MotWCreator/*`.
- **Two admin consoles:** `platform/src/pages/AdminPage.tsx` + panels, and `src/admin/AdminPanel.tsx`.
- **Show config split three ways:** `src/lib/shows/*.show.ts`, `showConfig` inside `src/systems/*.system.json` (has its own `showId`, accent, venue, date), and `platform/src/pages/recap/recapConfig.ts` + `LandingPage` constants. Accent colour and date are duplicated between the `.show.ts` and the system JSON.
- **Per-episode copies:** five MotW `.show.ts` files and three `liveMonster/*-ep{2,3,4}.config.ts` that are mostly copy-paste.
- **System JSON at repo root:** `honey-heist.system.json` (differs from `src/systems/`), `kids-on-bikes-2e.system.json` and `blade-runner-rpg_system.json` (identical copies). Not imported.
- `src/utils/{audioMixer,confetti,sounds}.ts` and `src/hooks/*` are re-export shims over `src/lib/audio-fx` (intentional, harmless).

## 7. Dead code

- `src/lib/reservations/*`, `src/components/Reservation/*`, `src/types/reservation.types.ts`: reservation system removed May 2026. Still imported by legacy files, `src/lib/index.ts` and `recapApi.ts`. The 18 failing tests all test this flow.
- Unrouted platform pages: `CompanionPage`, `MadLibsGatewayPage`, `MadLibsVotePage`, `ReservePage`.
- Most of the legacy app outside `/blade-runner/*`: decoder ring, ship combat, villagers, group roll, monster builder/vote/reveal, encounter vote, dice roller, `PlayView`, `PlayerView`, `QRDisplay`, `DisplayView`, and `src/themes/*` (which also hold the only `dangerouslySetInnerHTML`, rendering theme SVG files, not user input).
- `functions/`: email functions with no caller in the platform.
- Root clutter: `HANDOFF-may-{6,7}-2026.md`, root system JSON copies, `firebase-debug.log`/`firestore-debug.log` (ignored), 9 tracked files under `dist/` despite `dist` being in `.gitignore`.

---

## 8. Where `CLAUDE.md` no longer matched reality

Fixed in this audit: the Commands section and the Labs paths. Not fixed (needs Luke's call, listed so the next session can update them):

- **Commands:** there is no `platform/package.json` and no lint script. All commands run from the repo root (fixed).
- **Repository layout** omits the legacy app (`src/App.tsx`, `src/components`, `src/admin`), `src/data/`, `src/lib/shows/`, `functions/`, `scripts/`, `firestore.rules`. It also says the platform uses relative `../../../src/` imports; most imports now use the `@mtp/lib`, `@mtp/data`, `@mtp/firebase` aliases from `platform/vite.config.ts`.
- **Show system table:** the show definition has `era` (`live | upcoming | past | shelved`) as the lifecycle field; `status` is legacy. System JSON `showConfig` also carries `showId`, accent, date and venue.
- **Accent snippet** uses `showConfig.theme.accentColor`; shows also define `accentColor` on the `.show.ts`.
- **"Before each MotW show"** points at `monster-of-the-week-ep2.config.ts`; the latest is `ep4`.
- **Doodle images list** is missing the Halloween set (`detailed_purple_monster`, `orange_pumpkin_doodle`, `spider_web`, `spider`, `orange_scary_pumpkin`, `orange_jelly_monster`, `monster_doodle`, `haunted_house`, `scary_specter`, `full_moon_with_bats`, `vampire_fangs`).
- **Breakpoints table** omits the 420 / 480 px `max-width` queries.
- **Golden rule 3** (Vercel preview per branch) and the 48-hour freeze apply to the platform project. The legacy root project auto-deploys from `master`, so any merge also ships the Blade Runner app.
- **Live interaction rule 4** ("moderation by default") is not true for NPC display today (gap 1 above).
- **"Do not import Firebase SDKs outside `src/firebase.ts` and `src/lib`"** is broken in 3 platform files and ~30 legacy files.
- **Labs:** `/labs` has no index route; SBP code lives in `pages/labs/` + `components/sbp/`, not `features/`.

---

## Known mess

Top 10, ranked by risk, security first.

1. **NPC moderation bypass** (`firestore.rules` `npcs` update). Public device tokens mean anyone can edit any NPC and set `showOnDisplay: true`, putting unmoderated text on the projector. Green Oaks (Nov 28) runs on this collection. Fix before the show.
2. **Audience emails publicly listable** via `npcs.email`, `magic-tokens` and `reservations`. `magic-tokens` also leaks working return links and is writable by anyone.
3. **World-writable control docs:** `config/{active-interaction,live-cues,theme}` via the catch-all, `mad-lib-locks`, `mad-lib-active`. A phone can change what the room sees or hears.
4. **No length/shape validation in rules for audience text** (`beats.response`, NPC updates, bystander submissions, votes) and **no rate limiting anywhere**. Both are hard requirements in `CLAUDE.md`.
5. **`audience-profiles` open write.** Anyone can overwrite anyone's opt-in and NPC list.
6. **Open legacy collections**, including `blade-runner-characters` (live campaign data, deletable by anyone) and `archives/**` (the backups themselves).
7. **Rules are untested outside SBP.** Every gap above went unnoticed because there are no emulator tests for `npcs`, `beats`, `config`, `magic-tokens` or `audience-profiles`.
8. **Two deploy targets from one repo.** The legacy root project auto-deploys from `master`; the platform needs a manual promote. Easy to ship the wrong thing or forget to promote, especially near a show.
9. **Red baseline:** 18 failing tests and 32 + 21 type errors, all pre-existing. New breakage hides in the noise. No linter.
10. **Dead reservation system and legacy app** still compiled into the root build and imported by `recapApi.ts`, plus tracked `dist/` files and root JSON duplicates. Raises the cost of every change and the chance of editing the wrong copy.

---

## Proposed migration order

Each step is its own branch. Steps 1 to 3 are the only ones that should land before the Nov 26 freeze.

1. **Rules hotfix for Green Oaks.** *Done on branch `fix/green-oaks-rules-hotfix`, tests in `src/test/rules/live-show.rules.test.ts`; needs `firebase deploy --only firestore:rules` to take effect. Fixes gaps 1, 3, 4 and 5 and the `beats` part of 7. NPCs created before it have no `ownerUid` and are admin-edit only.* (Rules plus one client change: `createNpc` stamps `ownerUid`.)
   - `npcs` update: owner = `request.auth.uid` stored at create (anonymous uid), not the public device token. Owner may change only `displayName`/`fieldValues` with length caps. Only admins change `showOnDisplay`, `isActive`, `hasBeenTagged`. Drop the open `email` clause.
   - Length caps on `npcs` create and `beats.response`.
   - Remove `active-interaction`, `live-cues`, `theme` from the open `config` catch-all (admin write), and make `mad-lib-locks` / `mad-lib-active` admin-write. Check the legacy Blade Runner app does not write any of them first.
2. *Steps 2 and 3 done on branch `fix/audience-pii-rules` (stacked on step 1), tests in `src/test/rules/audience-pii.rules.test.ts`. Existing NPC emails are removed by `scripts/strip-npc-emails.mjs` (needs a service-account key). Remaining known gap: a stranger can still replace someone's `magicToken`/`accessCode` on their profile, since nothing proves email ownership.*
   **Stop leaking emails:** move NPC emails off the public `npcs` doc (it is already in `audience-profiles`), make `magic-tokens` get-only (no list) and create-only, set `reservations` to admin-only read.
3. **`audience-profiles` write validation:** shape + email format, create/merge only.
4. **Unify the baseline:** delete or quarantine the reservation tests, get tests green, add a `typecheck` script. Then make "build + test pass" mean something.
5. **Move platform Firebase stragglers into `src/lib`:** `recapApi.ts` → `src/lib/recap/recapApi.ts` (dropping `reservations`), anonymous sign-in → `src/lib/auth`.
6. **Retire the legacy app except Blade Runner:** either split Blade Runner into its own small app or strip the root build to just those routes, then lock the legacy collections.
7. **Collapse show config** to one source per show, and turn per-episode files into data.
8. **Features folders:** move one existing page per session into `platform/src/features/<name>/`, starting with whatever is being touched anyway.

## Building Green Oaks on the show system

Green Oaks already has a show (`src/lib/shows/green-oaks.show.ts`, `id: green-oaks`) and a system JSON (`src/systems/green-oaks.system.json`, Firestore episode id `greenoaks-2026-11-28`). On show day `config/platform.currentShowId` is set to that id and `/join` forwards there.

**NPC creator (townies).** Already built: `npcCreation` in the system JSON drives `NpcCreationPage`; the GM puts townies on the projector from `NpcAdminPanel`. Needs only migration step 1 so "GM approves before big screen" is actually enforced.

**Gossip line** (`platform/src/features/gossip-line/`):
- Config: `showConfig.gossipLine` in `green-oaks.system.json` with prompts, max length, and copy.
- Data: `src/lib/gossip/gossipApi.ts`, collection `gossip` with `{ showId, authorUid, text, promptId, status: 'pending', createdAt }`. Rules: create only with `status == 'pending'`, `authorUid == request.auth.uid`, text length capped, showId equal to `config/platform.currentShowId`; read of `pending` admin-only; status changes admin-only.
- Views: phone (submit, see "sent"), GM (queue with approve/reject, reusing the spotlight queue pattern from `components/spotlight/`), big screen (approved only, `aria-live="polite"`).
- Rate limit: one doc per `authorUid` per N seconds, enforced in rules by keying a `gossip-ratelimit/{uid}` timestamp doc.

**Bingo** (`platform/src/features/bingo/`):
- Config: `showConfig.bingo.squares` (pool of strings) and card size in the system JSON.
- Data: `src/lib/bingo/bingoApi.ts`. `bingo-calls/{showId}` (admin write: which squares the GM has called), `bingo-cards/{showId}__{uid}` (owner write: card layout seed + marks), `bingo-claims` (create-only by owner, admin moderates before a name hits the screen).
- Views: phone (card, tap to mark, marks shown by shape and colour, not colour alone), GM (call squares, verify claims), big screen (called squares, approved winners).
- Card layout is derived from a seed so it never needs a server.

All three key off `config/platform.currentShowId`; none invents its own "active show".
