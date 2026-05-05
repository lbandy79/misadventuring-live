# Misadventuring Party Live — 2026 Development Roadmap

## Overview

This roadmap balances your VBMS work schedule with incremental progress toward a fully-featured live show interaction platform. Each phase builds on the previous, with clear milestones and testable deliverables.

---

## Q1 2026: Foundation & MVP (January–March)

### January: Setup & Core Voting
**Goal:** Working prototype you could demo at a small gathering

**Week 1-2:**
- [ ] Complete Day 1 setup (local dev environment)
- [ ] Firebase project configured
- [ ] Basic voting component working locally

**Week 3-4:**
- [ ] Deploy to Vercel (get it on the internet)
- [ ] Custom subdomain: `play.misadventuringparty.com`
- [ ] Generate first QR code
- [ ] Test with 2-3 friends remotely

**Deliverable:** Live URL you can share, real-time voting works

---

### February: Admin Panel & Polish
**Goal:** You can control the app during a show without touching code

**Week 1-2:**
- [ ] Admin panel component (password protected)
- [ ] Change vote options on the fly
- [ ] Reset votes between encounters
- [ ] Toggle voting open/closed

**Week 3-4:**
- [ ] Visual polish pass (animations, transitions)
- [ ] Mobile optimization (most audience will be on phones)
- [ ] Sound effects on vote submission (optional but fun)

**Deliverable:** Admin can run an entire show from a phone/tablet

---

### March: Madlibs & NPC Naming
**Goal:** Two additional interaction modes ready for live testing

**Week 1-2:**
- [ ] Madlibs component
  - Configurable fields (noun, adjective, location, etc.)
  - Timer countdown
  - Random selection from submissions
  - Display reveal animation

**Week 3-4:**
- [ ] NPC Naming component
  - Text submission
  - Upvote/downvote system
  - Top 3 display for GM to choose from
  - Archive system (save to Firestore for recurring NPCs)

**Milestone:** First real test at Lucky Straws or similar venue

---

## Q2 2026: Engagement Features (April–June)

### April: Group Rolls & Chaos Meter
**Goal:** Deeper mechanical integration with the actual game

**Week 1-2:**
- [ ] Group Roll component
  - Audience taps to "add luck"
  - Aggregate into modifier or threshold
  - Big dice animation reveal
  - Sound design for tension/release

**Week 3-4:**
- [ ] Chaos Meter
  - Fills based on participation across all interactions
  - Configurable thresholds
  - Trigger events when meter fills
  - Visual "danger zone" escalation

---

### May: Influence Tokens & Prophecy Board
**Goal:** Gamified long-term engagement

**Week 1-2:**
- [ ] Influence Token system
  - Earn tokens from participation
  - Spend tokens on special actions
  - Persistent across sessions (requires user accounts)
  - Leaderboard display

**Week 3-4:**
- [ ] Prophecy Board
  - Audience predictions before/during show
  - Lock in predictions
  - Reveal outcomes at end
  - Points for correct predictions

**Consideration:** This is where you'll want Firebase Auth for user persistence

---

### June: Refinement & Show Integration
**Goal:** Smooth operator experience, battle-tested

**Week 1-2:**
- [ ] Operator dashboard
  - All controls in one view
  - Show "script" with pre-loaded interaction points
  - One-click scene transitions
- [ ] Analytics (participation rates, popular choices, etc.)

**Week 3-4:**
- [ ] Load testing (simulate 50-100 concurrent users)
- [ ] Fallback modes (what if Firebase goes down mid-show?)
- [ ] Documentation for running shows

**Milestone:** Run 2-3 shows with full feature set

---

## Q3 2026: Scaling & Brand (July–September)

### July: Multi-Show Support
- [ ] Multiple "rooms" for different shows/events
- [ ] Unique join codes per show
- [ ] Show history and replay data
- [ ] Audience can see their participation history

### August: Visual Identity
- [ ] Branded theme system (match Misadventuring Party aesthetic)
- [ ] Custom assets (icons, backgrounds, sound design)
- [ ] Sponsor integration options (if relevant for venue partnerships)
- [ ] Screenshot/shareable moments for social

### September: Community Features
- [ ] Audience profiles (optional)
- [ ] Recurring attendee recognition
- [ ] "Regulars" leaderboard
- [ ] Community NPC archive (audience-created characters that return)

---

## Q4 2026: Expansion & Optimization (October–December)

### October: Performance & Scale
- [ ] Caching optimization
- [ ] CDN for static assets
- [ ] Database indexing review
- [ ] Target: 200+ concurrent users without lag

### November: Advanced Features
- [ ] Heckler Mode (selected audience member gets antagonist voice)
- [ ] Mood Voting (audience picks ambiance/soundtrack)
- [ ] Integration with streaming software (OBS overlays)
- [ ] API for external tools

### December: 2027 Planning
- [ ] Review analytics from the year
- [ ] Gather audience feedback
- [ ] Plan feature roadmap for next year
- [ ] Consider: mobile app? White-label for other shows?

---

## Budget Projection

| Phase | Monthly Cost | Notes |
|-------|--------------|-------|
| Q1 | $0–10 | Free tiers cover everything |
| Q2 | $10–25 | May need Copilot, possibly Firebase paid |
| Q3 | $25–35 | Pro tier backend as traffic grows |
| Q4 | $35–50 | Scaling costs, custom domain SSL |

**Annual estimate:** $150–300 total

---

## Time Investment Estimate

| Phase | Hours/Week | Total Hours |
|-------|------------|-------------|
| Q1 | 4–6 | 50–75 |
| Q2 | 4–6 | 50–75 |
| Q3 | 3–5 | 40–60 |
| Q4 | 3–5 | 40–60 |

**Annual estimate:** 180–270 hours (~15–22 hrs/month average)

This is very doable alongside your VBMS work, especially since you can batch dev time around show schedules.

---

## Success Metrics

**By end of Q1:**
- Successfully run 1 live show with voting + madlibs
- 10+ audience participants in a single session

**By end of Q2:**
- 3+ shows run smoothly
- 50+ total unique participants
- Feature set that differentiates you from other actual plays

**By end of Q4:**
- Regular show schedule with reliable tech
- Audience expects and looks forward to interactions
- Platform ready to scale if opportunities arise

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Firebase outage during show | Offline fallback mode, manual dice backup |
| Feature creep delays MVP | Strict scope per phase, ship early/iterate |
| Work schedule conflicts | Batch dev on weekends, protect show days |
| Audience doesn't engage | Start small, iterate based on feedback |

---

## Quick Reference: What to Build When

| Feature | Phase | Priority |
|---------|-------|----------|
| Voting | Q1 Jan | Must have |
| Admin panel | Q1 Feb | Must have |
| Madlibs | Q1 Mar | Must have |
| NPC naming | Q1 Mar | Must have |
| Group rolls | Q2 Apr | High |
| Chaos meter | Q2 Apr | High |
| Influence tokens | Q2 May | Medium |
| User accounts | Q2 May | Medium |
| Prophecy board | Q2 May | Nice to have |
| Analytics | Q2 Jun | Nice to have |
| Multi-show rooms | Q3 | Future |
| Streaming integration | Q4 | Future |

---

**This is your north star.** Adjust as you learn what actually lands with audiences. The best features will reveal themselves through real shows with real people.

🎲 Go build something legendary.
