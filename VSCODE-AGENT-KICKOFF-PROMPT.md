# VSCode Agent Kickoff Prompt — Misadventuring Party Live

Copy and paste this entire prompt to start a new agent session. It captures the key decisions and context so you don't have to re-explain everything.

---

## THE PROMPT

```
I'm building a real-time audience interaction web app for live TTRPG shows called "The Misadventuring Party." I'm a senior frontend developer and tech lead with deep React/Redux expertise. Don't over-explain basics — treat me as a peer.

## Project Overview
A standalone React app (separate from my Squarespace marketing site) that lets live show audiences participate via their phones. Will be hosted at play.misadventuringparty.com via Vercel.

## Tech Stack (Already Decided)
- React with Vite (not CRA)
- Firebase Firestore for real-time data
- Framer Motion for animations
- Vercel for hosting
- No TypeScript for now (speed over type safety for MVP)

## Core Features to Build

### 1. Encounter Voting
- Binary or triple-choice votes with live countdown timer
- Real-time "tug of war" results bar showing vote split
- Votes persist, one vote per user (localStorage for MVP, auth later)
- Admin can set options, open/close voting, reset between encounters

### 2. Madlibs D&D
- Configurable fields (noun, verb, location, NPC name, etc.)
- Timer-based submission (30 sec per field)
- Random selection from audience submissions
- Theatrical "scroll reveal" animation for results

### 3. NPC Naming
- Text submission with character limit
- Upvote system so best names rise
- Top 3 displayed for GM to choose from
- Archive system to save audience-created NPCs for future shows

### 4. Group Rolls
- Audience taps/clicks to "add their luck" during dramatic moments
- Aggregate participation into a modifier or success threshold
- Big dice animation with sound for the reveal

### 5. Admin Panel
- Password protected (simple, not full auth)
- Change active interaction type
- Configure options on the fly
- Open/close interactions
- Reset data between encounters
- View participation counts

## Design Direction
- Dark fantasy aesthetic (deep blues, purples, gold accents)
- Mobile-first (90% of audience will be on phones)
- Satisfying micro-interactions (button feedback, vote confirmations)
- Should feel like part of the show, not a janky afterthought

## Current Status
- Local dev environment ready (Node, VSCode, Git)
- Firebase project created
- Basic EncounterVote component exists as starting point

## What I Need Help With
[REPLACE THIS SECTION WITH YOUR SPECIFIC ASK]

Examples:
- "Help me build the admin panel with controls for all interaction types"
- "Let's implement the Madlibs component with timer and reveal animation"
- "I need to refactor the voting component to support 3 options instead of 2"
- "Help me set up Firebase security rules for production"

## File Structure
```
misadventuring-live/
├── src/
│   ├── components/
│   │   ├── EncounterVote.jsx
│   │   ├── EncounterVote.css
│   │   ├── [new components go here]
│   ├── admin/
│   │   └── [admin panel components]
│   ├── firebase.js
│   ├── App.jsx
│   └── index.css
├── package.json
└── vite.config.js
```

## Constraints
- Keep it simple — this needs to work reliably during live shows
- Offline fallback awareness (what happens if Firebase hiccups?)
- No feature creep — MVP first, polish later
- I have limited dev time (nights/weekends around a full-time tech lead job)

Let's build.
```

---

## USAGE TIPS

1. **Always open your project folder first** before starting the agent session
2. Copy the entire prompt above (including the code fence markers)
3. Replace the "[REPLACE THIS SECTION]" part with your specific task
4. If the agent loses context, you can re-paste the "Tech Stack" and "Core Features" sections as a refresher

---

## QUICK TASK PROMPTS

Once context is established, you can use shorter prompts:

**For voting improvements:**
"Add a countdown timer to EncounterVote that auto-closes voting after 60 seconds. Show the timer visually."

**For madlibs:**
"Create a new Madlibs component. Fields should be configurable via props. Include a 30-second timer per field and queue through each field sequentially."

**For admin panel:**
"Build an AdminPanel component at /admin route. Include controls to: set vote options, toggle voting open/closed, reset vote counts, and switch between interaction modes."

**For NPC naming:**
"Create NPCNaming component with text input, submission list with upvote buttons, and auto-sorting by vote count. Top 3 should be visually highlighted."

**For Firebase:**
"Help me write Firestore security rules that allow anyone to read/write votes but only authenticated admins to modify the 'config' collection."
