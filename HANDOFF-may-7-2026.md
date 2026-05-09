# Handoff for next chat (written 2026-05-07)

## TL;DR

Major strategic update since `HANDOFF-may-6-2026.md`. The "Living World" framing has evolved into **The Misadventureverse**: an anthology production house with multiple series, light cross-canon, audience-as-canonical-contributors, and a **pen-and-paper umbrella aesthetic** with series-specific visual costumes. **Next ship:** a single recap page for Betawave Last Call (Apr 18, 2026) on a new branch `phase-10-betawave-recap`. Everything else (Channel Selector, Codex, Your Shape, multi-series navigation) is v2.

## Relationship to HANDOFF-may-6-2026.md

Read both docs together. May 6 covers the data-archive helpers, audit trail wiring, and current state of Firestore. May 7 (this doc) covers the strategic direction and the recap page spec. May 6 is still accurate on infrastructure. May 7 supersedes the "what to build next" section of May 6.

`phase-9-archive-helpers` (commit `747150d`) is committed but unmerged. Either merge to main first OR stack `phase-10-betawave-recap` on top.

## Strategic update

### The Misadventureverse model

- TMP is no longer a single-world setting. It's an **anthology production house** called **The Misadventureverse**.
- Each show is its own world. We call these "series."
- **Betawave Tapes** is one series (entropy-touched mythology, VHS-broadcast aesthetic, currently on Kids on Bikes 2E).
- **Soggy Bottom Pirates** is another series (maritime, currently in development).
- Future series will follow (noir, fantasy, etc.).
- Cast plays freely across series. Different characters, same trusted ensemble.
- Audience contributes pieces (NPCs, monsters, items) that can recur across the whole universe.
- Light or no canon between series. Each is its own world. No grand metaplot.

### Visual identity

**Umbrella aesthetic: pen-and-paper.**

- Lined notebook paper backgrounds (graph paper or dotted-grid for crunch sections).
- Hand-drawn line art, marginalia, eraser smudges.
- Ink color variation: blue ballpoint, black sharpie, red correction pen.
- Paper-clipped sticky notes, dice photographed on a desk.
- Hand-lettered or handwriting-style typefaces for headers (Permanent Marker, Kalam, Caveat, Special Elite, Bowlby One).
- Brand purple + amber threading through (existing logo colors).

**Series-specific costumes** evolve out of the paper substrate:

- Betawave Tapes = paper turned VHS broadcast (scanlines, neon, analog horror).
- Soggy Bottom Pirates = paper turned weathered parchment (sea-stained, treasure map).
- Future noir = paper turned redacted dossier or fax printout.
- Future fantasy = paper turned illuminated manuscript.

Same source. Different costume per series.

**Brand mark:** d20 ringed with hand-drawn flowers (already in use on Squarespace site). Umbrella icon for the whole production house.

**Counter-positioning note:** this is the deliberately anti-broadcast aesthetic. Critical Role and Dimension 20 are slick TV. The Misadventureverse is the kitchen table where it actually happened.

### Brand voice

- Tagline for new audiences: **"Where failing is fun."**
- Tagline for returning audiences: **"Everyone brings something to the party."**
- Mission statement: hope-filled stories where friendship is literal magic.

## Build scope: Betawave Last Call recap page

### The deliverable

A single URL on the platform app: `/recap/betawave-last-call-2026-04-18` (or similar). Public, linkable, beautiful. Renders only real data. No fabricated counts. Goes live before May 23 to double as marketing for the next show.

### Page sections

#### 1. Hero

- Show title: "The Betawave Tapes: Last Call"
- Subhead: "Chapter Four"
- Date: April 18, 2026
- Venue: Lucky Straws, Winter Garden, FL
- System badge: Kids on Bikes 2E
- **Visual:** Betawave's VHS-broadcast costume on top of pen-and-paper substrate (lined notebook paper showing through scanlines, marginalia, handwritten subhead).

#### 2. The Crowd at the Table

The centerpiece of the page. This is where audience contribution becomes visible canon.

- **Funnel callout above the grid:** "22 people reserved. 18 brought a character. Here's who showed up." (Real numbers from Firestore.)
- **Featured Character:** Banana Wamama Banana. Hero treatment at top of section. Larger card than the grid items. "On Air" pulse indicator. Full appearance description and trait. (This NPC got a 15-minute spotlight at the show; the page should reflect that weight.)
- **Grid:** 17 NPC cards on lined notebook paper backdrop. Each card carries:
  - Portrait (DiceBear pixel-art, seeded from `name`)
  - Name
  - Occupation (the "ROLE" line shown in caps in the existing admin UI)
  - Appearance blurb
  - Secret/trait line
- **Curation:** Filter out test entries (e.g., names containing "test" case-insensitive, or `gmFlagged: true`). Luke does a quick admin review pass before the page goes live. Recommend an admin-only "include in recap" toggle as a future enhancement, but for now a filter rule is sufficient.

#### 3. The Monster That Wasn't

A pen-and-paper sticky note where the monster section would have been: *"the monster builder closed before reveal. that one's lost to the betawave."*

Honest, brand-coherent, turns missing data into mythology. The `monster-builder/current` doc shows `status: closed` with empty `results` and `submissions`, confirmed by inspection of the May 6 backup. The data is genuinely gone. Don't try to reconstruct.

#### 4. Coming May 23

- Sticky note paper-clipped to the bottom of the page.
- Tape-card preview for the next show: date, venue, system or "system reveal coming."
- RSVP CTA links to existing reservation flow on the legacy app or the platform app's `/reserve` route once that's wired.

Build this section to gracefully handle either a named system or a "TBA" placeholder. May 23's chassis is being decided (see Open Decisions below).

#### 5. Tiny Footer / About this Page

One paragraph in small handwriting at the bottom: *"Every show generates audience-created characters. We turn them into permanent canon. Your contributions will recur."* Quietly tells the product story to anyone who clicks in.

### Data shapes (current Firestore, confirmed)

#### NPC doc (`npcs` collection)

```json
{
  "showId": "betawave-last-call-2026-04-18",
  "reservationId": "<id>",
  "systemId": "kids-on-bikes-2e",
  "name": "string",
  "occupation": "string",
  "appearance": "string",
  "secret": "string",
  "bestStat": "string",
  "worstStat": "string",
  "gmNotes": "string",
  "gmFlagged": false,
  "createdAt": <number>
}
```

Filter for recap rendering: `showId == "betawave-last-call-2026-04-18"` AND NOT `gmFlagged` AND NOT `name` matches `/test/i`.

#### Reservation doc (`reservations` collection)

```json
{
  "showId": "betawave-last-call-2026-04-18",
  "name": "string",
  "email": "string",
  "accessCode": "string",
  "npcCreated": true,
  "createdAt": <number>
}
```

Use for funnel stat: count of reservations with this `showId` versus count of npcs with this `showId`.

#### Avatar generation

Portraits are generated client-side via DiceBear pixel-art seeded from `name`. No avatar URL stored in Firestore. Render with the same library and seed pattern used in `NPCReviewPanel`.

### Visual implementation hints

- Use Framer Motion (already in stack) for subtle scanline animation on the Betawave hero card.
- Lined paper background as CSS pattern or repeating SVG.
- Marginalia in handwriting typefaces. Permanent Marker for sharpie headers. Kalam or Caveat for body handwriting. Special Elite for typewriter labels. Bowlby One carries through from the existing hero design.
- Three ink colors as theme tokens: blue ballpoint (~#1A3A7A), black sharpie (~#1C1C1C), red correction pen (~#D9352B).
- Brand purple and amber from existing logo run throughout.
- All sections render only when their data exists. No "coming soon" placeholders. Empty states are styled features (the Monster That Wasn't is the model).

## Reuse from existing infrastructure

- **`phase-9-archive-helpers` branch (commit `747150d`)** has soft-delete and audit helpers. Build `phase-10-betawave-recap` stacked on top, OR rebase after merging 9-archive-helpers to main.
- **Firestore reads only.** The recap page never writes. No new Firestore rule changes needed for this branch.
- **`<ShowProvider>` / theme system** already exists on the platform app at `platform/`. Reuse it for show-level theming.
- **`useAuth()` hook** exists. The recap page is public; no auth required for viewing. Do not expose `gmFlagged` or `gmNotes` on public reads.
- **Backup file:** `tmp/betawave-backups/betawave-2026-05-06T19-26-43-404Z.json` is the source of truth if Firestore gets touched again. Backup is gitignored. Treat as gold; copy somewhere outside the repo as additional insurance.

## Out of scope for this branch

Do not build any of the following on `phase-10-betawave-recap`:

- Channel Selector (multi-series picker)
- The Codex (artifact directory)
- Your Shape (audience profile / contribution tracking)
- Multi-show navigation
- Any new write paths
- Any auth-gated features
- Squarespace replacement / domain swap
- Deployment to apex domain (`themisadventuringparty.com`)
- Vercel project changes (separate branch / separate ticket)

These are v2. Don't implement now. Note them in the codebase as commented-out route stubs or empty pages if scaffolding helps, but no functionality.

## May 23 show context (background, not in scope)

The next show on May 23, 2026 is being designed as a **Mad Libs format**: audience fills word-prompts via the companion app, cast plays through the resulting absurd story in real time. Underlying TTRPG chassis is being decided between **Honey Heist** and **Lasers & Feelings**.

Why this matters for the recap page: the "Coming May 23" section may need to handle a "system reveal coming" placeholder or a named system, depending on when Luke decides. Build the section to handle either gracefully.

Why it doesn't block this branch: no new app features required for May 23. Existing companion-app voting and submission flows can be repurposed for word prompts at show time without code changes.

## Open decisions awaiting Luke

1. **TTRPG chassis for May 23:** Honey Heist or Lasers & Feelings.
2. **Series naming for the Mad Libs format:** Is this its own new series in the Misadventureverse (third series alongside Betawave Tapes and Soggy Bottom Pirates)? If yes, what's its name and visual costume?
3. **Curation rule for NPCs on the recap page:** Manual "include in canon" toggle in admin, or name-pattern + `gmFlagged` filter?
4. **Vercel deployment timing:** Recap page deploys to a fresh Vercel project (not the existing legacy app at `play.themisadventuringparty.com`). Apex domain swap from Squarespace happens AFTER May 23, not before.

The recap page can ship without resolving any of these. Item 1 and 2 affect promotional copy. Item 3 affects the curation step before going public. Item 4 is a deployment ticket separate from this branch.

## Suggested first prompt for Claude Code

```
Read HANDOFF-may-7-2026.md and HANDOFF-may-6-2026.md in the repo root.

Goal: implement the Betawave Last Call recap page as specified in May 7 handoff.
Branch: phase-10-betawave-recap (stacked on phase-9-archive-helpers).
Stack: React 18, TypeScript, Vite, Firebase Firestore, Framer Motion. Already in use on the platform app at platform/.

Approach:
1. Add route /recap/:showId to the platform app.
2. Build a RecapPage.tsx component that fetches from Firestore by showId.
3. Build sub-components: HeroSection, FeaturedCharacter, CharacterGrid, MonsterStickyNote, ComingNextStickyNote, AboutPageFooter.
4. Apply the visual identity tokens from the spec: pen-and-paper umbrella with Betawave VHS costume.
5. Render only real data. Empty states render as features, not placeholders.
6. Keep gmFlagged and gmNotes off the public reads.

Don't deploy. Don't push to main. Open the PR for review.
```

## Things to keep in mind

- Audience write rules in `firestore.rules`: don't loosen them. The recap page is read-only.
- Don't touch the `blade-runner-characters` collection (8 active player characters in a separate campaign).
- Don't deploy `firestore.rules` casually. They're committed but not deployed in `phase-9-archive-helpers`. Coordinate any rule deploys.
- Active git branch as of writing: `phase-9-archive-helpers` (unmerged, with `+1063 -10` pending review). Either merge to main first or stack on top.
- Backup `tmp/betawave-backups/betawave-2026-05-06T19-26-43-404Z.json` is gold. Copy outside the repo (cloud drive, separate folder).

## What success looks like

A public URL renders the Betawave Last Call show as a beautiful, honest artifact:

- Real reservation count, real character count, the actual characters audience members built.
- Banana Wamama Banana featured at the top.
- The lost monster handled as mythology, not an apology.
- A clear CTA pointing to May 23.
- Pen-and-paper umbrella with Betawave VHS costume.
- Loads in under 2 seconds.
- Looks gorgeous.
- Linkable. Shareable. Recruiter-clickable.

That URL is the portfolio piece. That URL is the marketing flywheel for the next show. That URL is the prototype of every future recap page in the Misadventureverse.

Build it well.
