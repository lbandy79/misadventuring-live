# The Misadventuring Party - Live App Vision

> This document captures the creative and technical vision for the app. Keep it updated. Any AI or future-you can use this to get back up to speed.

## The Elevator Pitch
A **Dimension 20-level** live audience interaction app that makes crowd participation feel like part of the show, not a janky afterthought. Think theatrical reveals, satisfying feedback, and production quality that matches professional actual-play streams.

## Core Philosophy
- **It's part of the show** — Every interaction should feel dramatic and intentional
- **System-agnostic** — D&D today, Kids on Bikes tomorrow, whatever's next
- **Mobile audience, iPad GM** — Two very different experiences, both polished
- **Reliability over features** — It HAS to work during a live show

## Multi-System Theming
The app should support swappable themes for different TTRPG systems:

### Planned Themes
| System | Aesthetic | Palette |
|--------|-----------|---------|
| **D&D / Fantasy** | Dark fantasy, gold accents, medieval weight | Deep blues, purples, gold |
| **Kids on Bikes** | 80s nostalgia, neon, Stranger Things vibes | Dark backgrounds, neon pinks/cyans, retro |
| **Future Systems** | TBD | TBD |

### Theme Implementation
- CSS custom properties for colors, fonts, borders
- Theme context/provider for runtime switching
- Admin can switch themes between shows (or mid-show for dramatic effect)

## Device Experiences

### Audience (Mobile - Portrait)
- 90%+ will be on phones
- Big tap targets, thumb-friendly
- Minimal UI chrome — the interaction IS the screen
- Satisfying micro-interactions (haptic-style feedback via animation)
- Fast load, works on spotty venue WiFi

### GM/Admin (iPad - Landscape)
- Dashboard layout optimized for tablet landscape
- See everything at a glance: current interaction, live stats, controls
- Touch-friendly controls (no tiny buttons)
- Possible: audience view preview on one side, controls on the other

### Display/Projector (Stream/Venue Screen)
- **The theatrical layer** — what the live audience and stream viewers SEE
- Full-screen dramatic animations
- Sound effects that auto-play on reveals
- No UI chrome — pure visual spectacle
- Captures well in OBS for streaming
- Routes: `/display` or `/projector`

#### Display View Features
- **Vote Results**: Tug-of-war bar with particle effects, winner announcement with fanfare
- **Madlibs Reveal**: Scroll unrolling animation, words appearing with ink effects
- **NPC Naming**: Top 3 rising up like a leaderboard, winner highlighted
- **Group Rolls**: Giant dice tumbling, landing with impact shake, modifier revealed
- **Idle State**: Atmospheric background, show logo, "interact at play.misadventuringparty.com" QR code

## Audio Design (Future)
- Ambient background loops per theme (tavern sounds for fantasy, synth hum for Kids on Bikes)
- Voting open: tension building music
- Voting close: drum roll or suspense sting
- Result reveal: fanfare or impact sound
- Sound should be toggleable (for venues with their own audio)

## Production Quality Goals
Inspired by Dimension 20's live shows:
- **Dramatic reveals** — Results don't just appear, they're unveiled
- **Tension building** — Timers, progress bars, anticipation
- **Celebration moments** — When votes close, when dice land, when names are chosen
- **Sound design** (future) — Audio cues that the live show can pipe through

## Features (MVP Priority Order)
1. ✅ Encounter Voting (2-3 options, timer, live results)
2. 🔲 Madlibs D&D (field submission, random selection, scroll reveal)
3. 🔲 NPC Naming (submit, upvote, top 3 display, archive)
4. 🔲 Group Rolls (tap to add luck, aggregate modifier, dice animation)

## Technical Decisions
- **React + Vite** — Fast, simple, no CRA bloat
- **Firebase Firestore** — Real-time sync, good enough for MVP scale
- **Framer Motion** — Animations that feel good
- **Vercel** — Deploy and forget
- **No TypeScript (for now)** — Speed over safety for MVP

## Constraints
- Limited dev time (nights/weekends)
- Must be reliable during live shows
- Offline awareness (graceful degradation if Firebase hiccups)
- No feature creep until MVP is solid

---

*Last updated: December 31, 2025*
