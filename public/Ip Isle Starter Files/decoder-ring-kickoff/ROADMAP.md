# Decoder Ring — Copilot Integration Roadmap

## What's in this kickoff package

```
src/
├── data/
│   └── decoderRingCharacters.ts    ← 50 characters, ship roles, eras, helpers
├── types/
│   └── decoderRing.types.ts        ← Firebase state, interaction types, helpers
├── admin/
│   └── DecoderRingAdmin.tsx        ← GM controls (mostly complete, needs CSS polish)
├── components/
│   ├── DecoderRingVote.tsx         ← Audience phone (year vote + role vote)
│   ├── DecoderRingVote.css         ← Phone styles
│   ├── DecoderRingDisplay.tsx      ← Venue screen / OBS overlay
│   └── DecoderRingDisplay.css      ← Display styles + flicker animations
└── ROADMAP.md                      ← This file
```

## Integration steps (priority order)

### 1. Copy files into berry-bay-companion
Drop the files from this kickoff into your existing project structure.
The paths match your existing layout.

### 2. Wire into App.tsx — no changes needed yet
The existing routing handles `decoder-ring` the same way as `monster-builder`.
But you DO need to add the component import + case in AudienceView and DisplayView.

### 3. AudienceView.tsx — add the decoder-ring case
In the interaction area (around line 120), add:

```tsx
{activeInteraction?.type === 'decoder-ring' && <DecoderRingVote />}
```

### 4. DisplayView.tsx — add the decoder-ring case
In the AnimatePresence block (around line 280), add:

```tsx
{activeInteraction.type === 'decoder-ring' && (
  <motion.div key="decoder-ring-display"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <DecoderRingDisplay onComplete={() => console.log('Decoder ring complete!')} />
  </motion.div>
)}
```

### 5. AdminPanel.tsx — import and drop in the card
At the top, import `DecoderRingAdmin`.
In the admin grid (before or after the monster-builder card), add:

```tsx
<DecoderRingAdmin />
```

The component is self-contained — it manages its own Firebase listeners.

### 6. Update ActiveInteraction type
In both AudienceView.tsx and AdminPanel.tsx, add `'decoder-ring'` to the
ActiveInteraction type union:

```tsx
type: 'none' | 'vote' | 'madlibs' | 'group-roll' | 'villager-submit' | 'monster-builder' | 'decoder-ring';
```

### 7. Copy cereal box images
From your OneDrive `Ip Isle Images` folder → `public/images/ip-isle/`
All 51 images, using the naming convention from well_of_lines_image_reference.md.

### 8. Firebase security rules
Add `decoder-ring` collection to your Firestore rules alongside `monster-builder`:

```
match /decoder-ring/{doc} {
  allow read: if true;
  allow write: if true; // tighten later
}
```

## Sunday show checklist

- [ ] Files copied into project
- [ ] AudienceView case added
- [ ] DisplayView case added  
- [ ] AdminPanel card added
- [ ] ActiveInteraction type updated
- [ ] Images in public/images/ip-isle/
- [ ] Firebase rules updated
- [ ] Pre-select 3-4 year sets for each of 5 spins
- [ ] Test: Admin → launch → phone shows year vote
- [ ] Test: Close vote → display shows character reveal
- [ ] Test: Role vote → close → character added to crew
- [ ] Test: Next spin → repeat cycle
- [ ] Test: Flicker animations visible on high-flicker characters

## What to customize in the admin for Sunday

The `YEAR_PRESETS` in DecoderRingAdmin.tsx are placeholder groupings.
Before the show, update these to match the story beats you want:

```ts
const YEAR_PRESETS: Record<string, number[]> = {
  'Spin 1 — Scout':    [1972, 1985, 1989, 2000],  // Pink, Specter, Shell, Bolt
  'Spin 2 — Navigator': [1983, 1988, 2017, 2022],  // Chomp, Pixel, Odyssey, Dash
  // etc.
};
```

Or just use the year picker grid to select on the fly during the show.

## What's NOT built (v2 after Sunday)

- Tap-to-stop-the-wheel mechanic (full physical interaction)
- Animated brass decoder ring on display (current: glowing circle MVP)
- Character-specific sound effects on reveal
- Ship silhouette with role slots filling in visually
- Multi-character year picker on phone (for years with 3+ chars)
- Flicker intensity affecting gameplay (mechanical consequences)
- Crew manifest export / social share card
- NPC characters (Pebblestones, Founder) as set-piece interludes
