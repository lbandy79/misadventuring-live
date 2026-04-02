# TMP Companion App — System-Driven Live Show Engine

## Project Context

This is the live audience interaction app for **The Misadventuring Party (TMP)**, a professional actual-play TTRPG show in Orlando, FL. The app powers live shows where audience members participate directly — voting, creating characters, rolling dice — all synced in real-time across phones, a GM control panel, and a projected display.

**Current mission:** Build features for the April 18, 2026 live show premiere: **The Betawave Tapes: Last Call** — a 1991 small-town Kids on Bikes one-shot at Lucky Straws in Winter Garden, FL. This is Tape #1 of TMP's flagship live show series. Every audience member creates an NPC before the show via the app, and those NPCs are woven into the live story.

**Long-term vision:** The app is a system-agnostic engine. TTRPG rules live in structured JSON files, and the app reads them to dynamically generate forms, dice mechanics, and character creation flows. Swap the system JSON + theme, and the same app runs a Kids on Bikes horror show, a D&D 5e pirate campaign, or a Mothership sci-fi one-shot. This is the technical architecture behind **The Betawave Tapes** — TMP's anthology series where each "tape" is a different RPG system and genre.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | CSS (vanilla, component-scoped `.css` files) |
| Animation | Framer Motion (installed and used throughout) |
| Database | Firebase Firestore (real-time sync via `onSnapshot`) |
| Hosting | Vercel (auto-deploy from GitHub on push to `master`) |
| Audio | Web Audio API (custom synth sounds) |
| Fonts | Google Fonts (varies by theme) |
| Profanity Filter | `bad-words` |
| QR Codes | `qrcode.react` |

## Architecture

### Three Views
1. **Audience View** (phone) — What audience members see on their mobile devices. Must be performant on spotty venue WiFi. Touch-optimized.
2. **Admin/GM View** (iPad/laptop) — GM control panel for triggering phases, reviewing submissions, managing show flow. Status/action/config layout reads left-to-right.
3. **Display View** (OBS/projector) — Projected on the venue screen. Theatrical, dramatic, designed to command a dark room. Synced to GM actions via Firestore.

### Real-Time Sync
All three views subscribe to shared Firestore documents/collections. When the GM triggers a phase change, all connected clients update simultaneously. Firebase `onSnapshot` listeners handle real-time updates.

### Theme System
The app uses a theme provider that maps theme objects to CSS custom properties (prefix: `--tmp-*`). Each theme defines colors, fonts, sounds, and visual treatments. Themes are swappable — the same mechanical features (voting, dice rolling, NPC creation) render differently per theme.

**CSS variable pattern:**
```css
--tmp-color-primary
--tmp-color-secondary
--tmp-color-tertiary
--tmp-bg-main
--tmp-bg-card
--tmp-font-display
--tmp-font-body
--tmp-font-accent
```

**Existing themes:** Soggy Bottom Pirates (cereal-punk pirate), Beast of Ridgefall (medieval fantasy). We are building a new **Betawave Tapes: Last Call** theme for this show — VHS tracking lines, neon-on-dark, analog static, retro-tech horror.

### Existing Features (already built)
- Dice roller with animations
- Live vote mechanic with countdown timer
- Monster/creature builder (audience picks parts from options)
- Monster reveal sequence (GSAP-style staggered dramatic reveal on Display)
- NPC/Villager creation form (name, species, occupation, quirk, item)
- QR code join flow
- GM control panel with phase management
- Screen shake, glow effects, blackout transitions
- Web Audio sound cues

### Repo
- GitHub: `lbandy79/misadventuring-live`
- Branch: `master`
- Auto-deploy: Push to master → Vercel builds → Live at `play.themisadventuringparty.com`

---

## Data-Driven System Architecture

### The Core Idea
TTRPG rules are data, not code. Instead of hardcoding "Brains, Brawn, Fight, Flight, Charm, Grit" into React components, we store the entire rule system in a structured JSON file. The app reads the JSON and dynamically generates UI — forms, stat selectors, dice rollers, character cards — from the data.

### System JSON Structure
Each TTRPG system gets a `{system-id}.system.json` file. The current file is `kids-on-bikes-2e.system.json`. The JSON has these top-level sections:

```typescript
interface SystemConfig {
  system: {
    id: string;           // "kids-on-bikes-2e"
    name: string;         // "Kids on Bikes"
    edition: string;
    publisher: string;
    description: string;
  };

  stats: Stat[];          // All character stats with descriptions and likely verbs
  dice: DiceConfig;       // Available dice types and what each means
  ageGroups: AgeGroup[];  // Child/Teen/Adult with stat bonuses and free strengths
  tropes: Trope[];        // All 24 character tropes with stat assignments
  strengths: Strength[];  // All strengths with AT costs and mechanics
  flaws: Flaw[];          // All flaws
  statChecks: StatCheckRules;  // Difficulty scale, lucky breaks, AT economy

  npcCreator: {           // Simplified character creation config for audience NPCs
    fields: FormField[];  // What the form asks for — reads from stats for dropdowns
    statAssignment: {     // How audience NPCs assign stats (simplified)
      best: string;       // "d20"
      worst: string;      // "d4"
      remaining: string;  // "GM assigns during play"
    };
  };

  showConfig: {           // Per-show overrides — changes every show
    showId: string;
    showName: string;
    setting: { era: string; location: string; coreLocation: string; };
    npcCreatorOverrides: {
      occupationSuggestions: string[];  // Era/setting-appropriate suggestions
      secretPrompt: string;            // Themed prompt for the secret field
    };
  };
}
```

### How Components Use the System JSON

**NPC Creator Form** — reads `npcCreator.fields` to generate form steps:
```tsx
// DON'T do this:
<select>
  <option>Brains</option>
  <option>Brawn</option>
  {/* hardcoded stats */}
</select>

// DO this:
const { stats } = useSystemConfig();
<select>
  {stats.map(stat => (
    <option key={stat.id} value={stat.id}>{stat.name}</option>
  ))}
</select>
```

**Stat descriptions** — when a user selects "Brains" as their best stat, show the description from `stats[].description` and the likely verbs from `stats[].likelyVerbs` as helper text.

**Occupation suggestions** — read from `showConfig.npcCreatorOverrides.occupationSuggestions` to show era-appropriate suggestions (1991 small-town bar occupations for this show).

**Dice roller** — reads `dice.available` and `dice.descriptions` to know what dice exist in this system and what they mean.

**Character card render** — reads the NPC's selected stats, maps them against `stats[]` for display names and descriptions.

### System Config Provider
Create a React context that loads the system JSON and makes it available app-wide:

```tsx
// SystemConfigProvider.tsx
const SystemConfigContext = createContext<SystemConfig | null>(null);

export function SystemConfigProvider({ systemId, children }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    // Load from local JSON file or Firestore
    import(`../systems/${systemId}.system.json`).then(setConfig);
  }, [systemId]);

  return (
    <SystemConfigContext.Provider value={config}>
      {children}
    </SystemConfigContext.Provider>
  );
}

export const useSystemConfig = () => useContext(SystemConfigContext);
```

### Why This Matters
- **One NPC creator component** serves every TTRPG system. Kids on Bikes has 6 stats. D&D has 6 different stats. Mothership has different ones. The form doesn't care — it reads the JSON.
- **Show setup is config, not code.** To prep a new live show, create a `showConfig` entry (or a new JSON file), build a theme, done. No new React components needed.
- **The Betawave Tapes architecture.** Each "tape" = a system JSON + a theme. The mysterious video rental shop concept maps 1:1 to the technical architecture.
- **Future system JSONs:** `dnd-5e-2024.system.json` (for Soggy Bottom Pirates), `mothership.system.json`, `monster-of-the-week.system.json`, etc.

---

## What We're Building (April 18th)

### 1. System Config Provider + Kids on Bikes JSON
Load and serve the `kids-on-bikes-2e.system.json` via React context. All downstream components consume system data through `useSystemConfig()`. The JSON file is already built — it contains all 24 tropes, all stats, all strengths/flaws, the difficulty scale, and the simplified NPC creator field config.

### 2. Betawave Tapes: Last Call Theme
**Aesthetic:** 1991 small-town America. VHS era. A going-away party at the local bar that curdles into analog horror. The app itself is diegetic — tracking lines and static on the audience's phones are the Betawave bleeding into their devices. Retro-tech horror where every screen becomes suspect.

**Color palette direction:**
- Primary: Neon magenta or hot pink (VHS label energy)
- Secondary: Electric cyan/teal (CRT glow)
- Tertiary: Warm amber (bar light, beer signs)
- Background: Near-black with subtle scan lines (#0A0A0F range)
- Accents: Static white (glitch moments), deep red (warning/bleed states)

**Font direction:**
- Display: Monospace or VCR-style font (e.g., VT323, Share Tech Mono, or similar Google Font with CRT energy)
- Body: Clean readable sans-serif for phone screens
- Accent: Something that evokes VHS label printing or 90s rental store signage

**Visual treatments:** CRT scan lines (pure CSS, zero perf cost), VHS tracking distortion on transitions, static/noise overlays during bleed moments, warm-to-cold color shift as the show progresses (Act 1 amber, Act 2 cyan/static). The app should feel like a tape that's degrading.

### 3. Reservation + Ticket Code Auth Flow
**New Firestore collection: `reservations`**
```typescript
interface Reservation {
  id: string;               // auto-generated
  name: string;
  email: string;
  accessCode: string;        // 6-char alphanumeric, auto-generated
  createdAt: Timestamp;
  npcCreated: boolean;       // flips true when they complete NPC form
  showId: string;            // matches showConfig.showId in system JSON (e.g., "betawave-last-call-2026-04-18")
}
```

**Flow:**
1. User hits the app landing page → enters access code from their reservation
2. Valid code → unlocks NPC Creator
3. Invalid/missing code → "Reserve your spot" link (or in-app reservation form)

**Reservation creation** can be a simple form: name + email → generates access code → stores in Firestore → emails/displays code to user. Keep it lightweight. No payment processing.

### 4. NPC Creator Form (System-Driven)
**New Firestore collection: `npcs`**
```typescript
interface NPC {
  id: string;
  reservationId: string;      // links to reservation
  showId: string;             // matches showConfig.showId
  systemId: string;           // "kids-on-bikes-2e" — which system JSON created this NPC

  // Character data — field names match npcCreator.fields[].id in system JSON
  name: string;
  occupation: string;
  appearance: string;
  secret: string;
  bestStat: string;           // stat ID from system JSON (e.g., "charm")
  worstStat: string;          // stat ID from system JSON (e.g., "brawn")

  // GM fields
  createdAt: Timestamp;
  gmNotes: string;
  gmFlagged: boolean;
}
```

**Form UX:**
- Step-by-step wizard, not a single long form (better on phones)
- **Form fields are generated from `npcCreator.fields[]` in the system JSON** — labels, placeholders, help text, validation rules all come from config
- **Stat dropdowns are generated from `stats[]`** — show stat name, description, and likely verbs as helper text when selected
- **Occupation suggestions come from `showConfig.npcCreatorOverrides.occupationSuggestions`**
- Profanity filter on text fields (bad-words)
- Each step has themed transitions (Framer Motion, styled by current theme)
- Final step: review your character → submit
- After submission: character card render (see #5)

**Validation from config:**
- `bestStat` and `worstStat` must differ (defined in `npcCreator.fields[].validation: "mustDifferFrom:bestStat"`)
- Required fields marked in JSON
- Max lengths defined in JSON

### 5. Character Card Render
After NPC submission, render the character as a VHS-styled character card. This is shareable — audience members screenshot and post it, which drives organic social promotion.

**Design concept:**
- VHS tape label proportions (landscape, roughly 6x3.5 ratio)
- "THE BETAWAVE TAPES" header with tracking line distortion
- Character name, occupation, and appearance displayed in monospace/CRT font
- **Best and worst stats displayed with their system descriptions** (e.g., "Best: Charm — the smooth talker" / "Worst: Brawn — not lifting anything heavy")
- Scan line overlay, subtle static noise texture
- Secret is NOT shown on the card (that's between the player and the GM)
- Subtle "TAPE #1: LAST CALL | APRIL 18, 2026" footer
- The card should look like a freeze-frame from a VHS tape — a moment captured in analog

**Implementation:** React component rendered to a styled div. The card component reads stat display names from the system JSON. Consider `html2canvas` or similar if you want a downloadable image version, but a well-styled div that looks good in a screenshot is the MVP.

### 6. GM Dashboard (NPC Review)
Extend the existing Admin/GM panel with an NPC management view:

- List all submitted NPCs for the current show (filter by `showId`)
- Each NPC card shows: name, occupation, appearance, secret, best/worst stats **(stat names read from system JSON)**
- GM can add notes (free text field per NPC)
- GM can flag/star NPCs for plot integration
- Sort/filter by flagged status
- Show total NPC count
- **Stat helper info:** When GM hovers/taps a stat, show the `likelyVerbs` from the system JSON — helps the GM know what rolls to call for each NPC during the show

This doesn't need to be fancy — functional and readable on an iPad is the bar.

---

## File Structure (New Files)

```
src/
├── systems/
│   └── kids-on-bikes-2e.system.json    # System rules as data
├── contexts/
│   └── SystemConfigProvider.tsx         # React context for system JSON
├── components/
│   ├── NPCCreator/
│   │   ├── NPCCreator.tsx              # Wizard wrapper — reads npcCreator.fields
│   │   ├── NPCCreator.css
│   │   ├── StatSelector.tsx            # Dropdown — reads stats[]
│   │   └── CharacterCard.tsx           # VHS-styled card render — reads stats[] for display
│   ├── Reservation/
│   │   ├── ReservationForm.tsx         # Name + email → access code
│   │   ├── AccessCodeEntry.tsx         # Code input → unlock NPC creator
│   │   └── Reservation.css
│   └── GMDashboard/
│       ├── NPCReviewPanel.tsx          # NPC list with flag/notes
│       └── NPCReviewPanel.css
├── hooks/
│   └── useSystemConfig.ts              # Hook wrapping context consumer
└── types/
    ├── system.types.ts                 # TypeScript interfaces for system JSON
    ├── reservation.types.ts
    └── npc.types.ts
```

## Coding Conventions

- Component-scoped CSS files (e.g., `NPCCreator.tsx` + `NPCCreator.css`)
- Framer Motion for all animations and transitions
- Firebase imports from a shared config file
- TypeScript interfaces for all Firestore document shapes AND system JSON shapes
- **Never hardcode system-specific values (stat names, dice types, trope lists) in components** — always read from system JSON via `useSystemConfig()`
- Use existing theme system — new theme follows the same `TMPTheme` interface
- Mobile-first for Audience views, desktop-first for Admin views
- Test on iOS Safari (it's always the gremlin)

## Priority Order
1. System Config Provider + TypeScript types for system JSON
2. NPC Creator form (system-driven) + Firestore integration
3. Reservation/access code flow
4. VHS character card render
5. VHS / Betawave Tapes theme (can be developed in parallel with above)
6. GM Dashboard NPC review panel

## How I Work
I use **GitHub Copilot in VS Code with Plan mode** — propose changes for review before implementation. Start with the highest-impact, lowest-complexity wins. When building new components, scaffold the structure first, then iterate on styling and polish. Always consider how it looks/works on a phone screen in a dark room.

## Key Reference Files
- **`kids-on-bikes-2e.system.json`** — Source of truth for all Kids on Bikes rules, stats, tropes, strengths, flaws, and NPC creator config. Open it alongside this prompt when working on any system-driven component.
- **This prompt** — Architecture overview, Firestore schemas, component structure, coding conventions.
