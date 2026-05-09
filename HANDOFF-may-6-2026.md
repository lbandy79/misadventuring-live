# Handoff for next chat (written 2026-05-06)

## TL;DR

Phases 0–9A shipped over a long stacked-PR run. Latest branch `phase-9-archive-helpers`
(commit `747150d`) adds defensive snapshots so Firestore "reset" buttons stop wiping
show history. **Next chat's job: design + build a Betawave recap page** — that's the
portfolio piece. User is being benched at work; site is now resume-relevant.

## What's deployed vs what's local

- **Production:** still the pre-Phase-0 legacy app. Nothing in this whole conversation
  has been deployed. Players hitting the live URL right now use the version from before Apr 18.
- **`firestore.rules`:** committed but NOT deployed. Don't `firebase deploy --only firestore:rules`
  without coordinating — would lock out parts of the app.
- **Local-only assets that must not be lost:**
  - `tmp/betawave-backups/betawave-2026-05-06T19-26-43-404Z.json` — full Betawave snapshot, 22 reservations + 18 NPCs un-redacted
  - `tmp/blade-runner-backups/blade-runner-2026-05-06T19-19-56-340Z.json` — 8 BR characters
  - User should run `node scripts/backup-blade-runner.mjs` before each personal session and `node scripts/backup-betawave.mjs` before any reset/deploy.

## The Betawave gold (what data the recap can use)

Real, confirmed in Firestore today:
- **`reservations`:** 22 docs, all `showId: betawave-last-call-2026-04-18`, dates Apr 3–19
- **`npcs`:** 18 docs, ALL named, all `showId: betawave-last-call-2026-04-18`, 18/22 conversion (82%)
- **`monster-builder/current`:** survived — `status: closed`, 5 winning parts captured
- **`villagers/current`:** WIPED to 0 submissions (singleton overwritten — recoverable only from backup if user has one)
- **`votes/current-vote`:** RESET (totalVotes=0)
- **`decoder-ring/current`:** missing
- **`ship-combat/current`:** missing

So the recap page for Betawave can render: **the 18 named characters + the assembled monster + reservation funnel stats**. Cannot render villagers/votes/decoder/ship-combat — that data is gone unless user has older backup.

## Older shows (Beast of Ridgefall, Soggy Bottom Pirates, etc.)

Confirmed gone. Two reasons combined:
1. Predated Phase 0–3 `showId` stamping on `npcs`
2. Admin "Clear All NPCs" button + singleton-doc overwrites destroyed everything

User confirmed: he tapped clear-all in the UI not realizing there was no archive. Acknowledged + moved on. No salvage path.

## Shipped this conversation (recap of branches)

```
main → phase-0-1-foundations → phase-2a/2b/2c → phase-3a/3b/3c
→ phase-4-platform-scaffold → phase-5-marketing-reservation
→ phase-6-live-show-shell → phase-7-companion → phase-8-auth
→ phase-9a-legacy-admin-auth → phase-9-archive-helpers (CURRENT, unmerged)
```

Each branch was pushed; user said 9A was already merged to main before we did 9-archive-helpers. So `phase-9-archive-helpers` is stacked on the merged 9A.

### Phase 8 (auth foundation): commit `d012e86`
- Firebase Auth + admin allowlist via `config/admins.emails`
- `<AuthProvider>` wraps platform; `useAuth()` exposes `{ user, isAdmin, isLoading, signIn, signOut }`
- Header `AuthMenu` widget (sign in / avatar popover / admin star)
- Platform `/admin` route gated by `isAdmin`
- `firestore.rules` requires admin auth for: `config/platform`, `config/admins`, NPC delete, NPC `gmFlagged`
- User must in Firebase console: enable Google sign-in, create `config/admins` doc with their email, then deploy rules

### Phase 9A (legacy admin migration): commit `11eac0e`
- Killed `VITE_ADMIN_PASSWORD` in legacy `/admin`
- Legacy `AdminPanel.tsx` now uses `useAuth().isAdmin` instead of password
- Three-state login card: checking / signed-out (Sign in with Google) / signed-in-but-not-admin
- Legacy `main.tsx` wraps app in `<AuthProvider>`
- `.env.example` no longer mentions `VITE_ADMIN_PASSWORD`

### Phase 9-archive-helpers (THIS chat): commit `747150d`
- `src/lib/archive/index.ts` — `softDeleteDoc()` + `archiveSingleton()`
- Wired into:
  - `NPCReviewPanel.deleteNpc` + `clearAllNpcs` → soft-delete to `npcs-archive/`
  - `AdminPanel.activateGroupRoll/activateVillagerSubmission/activateMonsterBuilder/resetMonsterBuilder` → archive before setDoc
  - `DecoderRingAdmin.launchDecoderRing` + `resetEverything` → archive first
  - `ShipCombatAdmin.loadCrewFromDecoderRing/loadDefaultCrew/resetEverything/[Reset Combat button]` → archive first
- `firestore.rules` adds:
  - `npcs-archive/{id}` open
  - `archives/{showId}/{document=**}` open
  - `blade-runner-characters/{id}` open (was missing — would have broken BR campaign on first rules deploy)
- Three new scripts in `scripts/`:
  - `audit-show-data.mjs` — read-only Firestore audit grouped by showId
  - `backup-betawave.mjs` — full Betawave snapshot to `tmp/betawave-backups/`
  - `backup-blade-runner.mjs` — full BR roster snapshot to `tmp/blade-runner-backups/`
- All scripts read `.env.local` directly (no dotenv dep). `tmp/` added to `.gitignore`.

## The big strategic shift (read this)

We started this conversation thinking Phases 9B/C/D/E/F (lock down rules / unify apps / redirect URLs / polish / docs) were next. **User pivoted away from that:**

1. He's being benched at work — this is potentially his portfolio for a job hunt.
2. He wants the site to "lead to something new" — an experience CR/D20 can't offer.
3. May 23 = next live show. Apr 18 Betawave was the best show.

I proposed three forward directions: **A. Living World (recap pages from real show data)**, **B. Companion as a Game (between-shows engagement)**, **C. SaaS multi-tenant**. I recommended **A** as the portfolio play because it produces shareable URLs and uses what Phases 0–3 set up.

User agreed by implication and asked for the audit + backup work first. **Next chat's mission: design + build the Betawave recap page.**

## What the recap page should be (pre-design notes)

- One beautiful page at `/recap/betawave-last-call-2026-04-18` (or similar URL) on the platform.
- Shipped before May 23 so it doubles as marketing for the next show.
- Sections that ONLY render if data exists (no "coming soon" placeholders):
  - Hero with show theme art + date
  - "Characters at the Table" — 18 NPC cards in a grid
  - "The Crowd Built" — the assembled monster from `monster-builder/current.results`
  - Reservation funnel stat: "22 reserved → 18 built characters"
  - "Coming May 23" CTA at the bottom linking to `/reserve?show=<next>`
- The story: "I noticed every show's data was being thrown away. I turned it into a permanent public artifact, and the artifact became the next show's marketing."

Suggested approach for next chat:
1. Open `tmp/betawave-backups/<latest>.json` and look at the actual NPC/monster shape
2. Design the recap page sections against real data
3. Build it on the platform (`platform/src/pages/RecapPage.tsx`) with route `/recap/:showId`
4. Reuse existing `<ShowProvider>`, theme system, etc.
5. Ship as `phase-10-betawave-recap` branch

## Things to be careful about in next chat

- Do NOT deploy `firestore.rules` casually — they're committed but not deployed. User must do that manually.
- Do NOT touch the `blade-runner-characters` collection without prompting. 8 active player characters in there.
- The `phase-9-archive-helpers` branch is NOT merged yet. Either merge it before stacking, or stack on it.
- Active git branch as of this writing: `phase-9-archive-helpers`.
- User's terminology: "go" = advance to next phase, "commit" = land changes, "dev" = spin up local server. Active dev terminal may still be running.
- User keeps things honest — don't oversell scope, name what's not done.

## Active terminal at end of session

PowerShell at `c:\Users\ghost\OneDrive\The Misadventuring Party\Live MTP App\misadventuring-live-starter`. Last command was the push of `747150d`. Two backup JSONs sit at `tmp/`.
