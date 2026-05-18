# Honey Heist Mad Libs — Text Audit

**Canonical implementation confirmed:** Group A (NpcCreationPage, MadLibsDisplayPage, MadLibsAdminPanel, NpcAdminPanel).  
**Audit date:** 2026-05-14  
**Scope:** All audience-facing and admin-facing UI strings in the confirmed canonical Honey Heist Mad Libs flow.

---

## Scope notes

- **MadLibsAdminPanel** is included (canonical Group A) but is **not rendered for Honey Heist** in the current `AdminPage.tsx` — only `NpcAdminPanel` is wired for `mad-libs-honey-heist`. The MadLibsAdminPanel would show "No Mad Libs defined for this show." if reached, because `honey-heist.system.json` has no `showConfig.madLibs[]` array. Its strings are inventoried for completeness.
- **NpcCard** renders only dynamic data from `NpcProfile` and `field.label` values sourced from `honey-heist.system.json`. No hardcoded user-visible strings — dynamic fields are captured in Section 2.
- **AdminPage auth strings** (sign-in required, not-an-admin) are generic platform strings, not Honey Heist–specific. They are included below under NpcAdminPanel's parent page with a flag.
- **`stingerQueue.label`** fields on `promptPresets` (e.g., "Walk in at the worst moment") surface only in `NpcAdminPanel` FireTab — GM-facing, not audience-facing. They are included and flagged.
- **`stingerQueue.responseSlots[].label`** (e.g., "What you did") are shown only in the admin FireTab preview, not to audience. The audience sees only `slot.type`. Both are captured.

---

## 1. UI Chrome

Buttons, headers, instructions, confirmation messages, error states, loading text.

---

### NpcCreationPage — Guard states
`platform/src/pages/NpcCreationPage.tsx`

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Show not found` | 331 | `<h1>` — show not found guard | Shown when URL showId doesn't resolve |
| `← Back to all shows` | 332 | `<Link>` text | Link to `/shows` |
| `This show isn't ready yet.` | 340 | `<h1>` — configError guard | Shown when system.json has no `npcCreation` |
| `The Mad Libs haven't been loaded. Check back closer to showtime.` | 341 | `<p>` — configError guard | |
| `← Back to show page` | 342 | `<Link>` text | Link to `/shows/:showId` |
| `Loading…` | 350 | `<p className="join-loading">` — loading guard | While auth + config load |

---

### NpcCreationPage — Reveal screen (`phase === 'reveal'`)

| Text | Line | Component context | Notes |
|---|---|---|---|
| `{showConfig.showName}` | 380 | `<p className="join-eyebrow">` | Dynamic — resolves to `"Mad Libs Honey Heist"` from `showConfig.showName` |
| `Here's who you are.` | 381 | `<h1 className="join-title">` | |
| `{myNpc.displayName}` | 385 | `<p className="join-reveal__name">` | Dynamic — NPC's assembled display name |
| `{revealSentence}` | 387 | `<p className="join-reveal__sentence">` | Dynamic — `composeFromWords(revealTemplate, words)`; conditional (only if revealTemplate set) |
| `Got it. I'm in.` | 395 | `<button className="btn-primary join-reveal-cta">` | Advances to `my-npc` phase |

---

### NpcCreationPage — Create / Edit form (`phase === 'create'`)

| Text | Line | Component context | Notes |
|---|---|---|---|
| `{showConfig.showName}` | 408 | `<p className="join-eyebrow">` | Dynamic |
| `Change your answers` | 410 | `<h1 className="join-title">` | Edit mode only (`isEditing === true`) |
| `Make yourself a character.` | 410 | `<h1 className="join-title">` | Create mode only (`isEditing === false`) |
| `Pick one for each slot. Don't think too hard.` | 414 | `<p className="join-subtitle">` | Create mode only |
| `What do they call you?` | 421 | `<label htmlFor="npc-name">` | Name field label |
| `Enter a name…` | 429 | `<input placeholder>` | Name field placeholder |
| `Everyone votes on these` | 448 | `<span>` inside `.join-form__world-divider` | Divider between personal and world fields |
| `Fill in every blank first.` | 208 | `<p className="join-form__error">` (via `submitError` state) | Validation error — not all fields filled |
| `Something went sideways. Try again?` | 252 | `<p className="join-form__error">` (via `submitError` state) | Network/write error on submit |
| `Saving…` | 471 | `<button className="btn-primary join-submit">` | While `submitting === true` |
| `Save changes` | 473 | `<button className="btn-primary join-submit">` | Edit mode, idle |
| `That's me. I'm in.` | 475 | `<button className="btn-primary join-submit">` | Create mode, idle |
| `Never mind` | 483 | `<button className="btn-ghost join-cancel">` | Cancel edit — returns to `my-npc` phase |

---

### NpcCreationPage — My NPC view (`phase === 'my-npc'`)

| Text | Line | Component context | Notes |
|---|---|---|---|
| `{showConfig.showName}` | 503 | `<p className="join-eyebrow">` | Dynamic |
| `You're in.` | 504 | `<h1 className="join-title">` | |
| `Keep this tab open. The GM might call on you.` | 505 | `<p className="join-subtitle">` | |
| `Your Stingers` | 519 | `<h2 className="join-my-stingers__title">` | Section heading; `aria-label="Your stingers"` on section |
| `What's happening` | 535 | `<h2 className="join-feed__title">` | Section heading; `aria-label="Live stinger feed"` on section |
| `We sent a link to {savedEmailAddress}. Check your inbox to come back to your character any time.` | 551 | `<p className="join-save-char__done">` | Post-save confirmation; `savedEmailAddress` is dynamic |
| `Save your character. Come back any show.` | 555 | `<p className="join-save-char__heading">` | Email capture heading |
| `you@example.com` | 563 | `<input placeholder>` — email field | |
| `…` | 573 | `<button className="join-save-char__btn">` | While `emailSaving === true` |
| `Save` | 573 | `<button className="join-save-char__btn">` | Email save idle state |
| `Save my character AND send me my Misadventuring Notebook after each show.` | 584 | `<label>` — checkbox opt-in | |
| `Something went sideways. Try again.` | 320 | `<p className="join-save-char__error">` (via `emailSaveError` state) | Email save error — note: no `?` here; compare to submit error at line 252 which has `?` |
| `Change my answers` | 594 | `<button className="btn-ghost join-edit-btn">` | Opens edit flow |

---

### NpcCreationPage — FieldBlock sub-component

Rendered once per field in the create form. Strings here repeat for each of the six fields defined in `showConfig.npcCreation.fields`.

| Text | Line | Component context | Notes |
|---|---|---|---|
| `{field.type}` | 647 | `<span className="join-field__type">` | Dynamic word-type label, e.g. `"ADJECTIVE"`, `"JOB TITLE"`, `"NOUN"`, `"PLACE"` — sourced from `npcCreation.fields[].type` |
| `everyone votes` | 649 | `<span className="join-field__world-tag">` | Shown only on world fields (`field.fieldType === 'world'`) |
| `Write in…` | 682 | `<button className="join-field__write-in-toggle">` | Opens write-in input |
| `` `Your own ${field.type.toLowerCase()}…` `` | 692 | `<input placeholder>` — write-in input | Template literal; resolves e.g. to `"Your own adjective…"`, `"Your own place…"` |
| `← Presets` | 706 | `<button className="join-field__write-in-cancel">` | Closes write-in, returns to preset options |

---

### MadLibsDisplayPage — Guard states
`platform/src/pages/MadLibsDisplayPage.tsx`

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Show not found` | 207 | `<h1>` — showId guard | |
| `No show is registered with id "{showId}".` | 208 | `<p>` — showId guard | `showId` is dynamic |
| `{show.name}` | 215 | `<h1>` — configError guard | Dynamic show name in error state |
| `{configError}` | 216 | `<p>` — configError guard | Dynamic; set to `"Could not load the show config."` at line 127 |
| `Loading…` | 223 | `<p>` — config loading guard | |

---

### MadLibsDisplayPage — IDLE mode (`DisplayIdle`)

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Tonight at The Misadventuring Party` | 294 | `<p className="madlibs-display-eyebrow">` | Hardcoded org name |
| `{show.name}` | 295 | `<h1 className="madlibs-display-title">` | Dynamic — `"Mad Libs Honey Heist"` |
| `{dateLabel}` | 296 | `<p className="madlibs-display-date">` | Dynamic — formatted `show.nextDate`; conditional |
| `Scan to join` | 304 | `<p className="madlibs-display-qr-label">` | NPC Mad Libs shows (`voteUrl` ends in `/join`) |
| `Scan to vote` | 304 | `<p className="madlibs-display-qr-label">` | Classic voting shows |
| `{stripScheme(voteUrl)}` | 306 | `<p className="madlibs-display-qr-url">` | Dynamic — URL without `https://` |
| `What's happened so far` | 312 | `<p className="madlibs-display-stinger-feed-label">` | Stinger feed section label; conditional on `approvedBeats.length > 0` |

---

### MadLibsDisplayPage — OPEN mode (`DisplayOpen`)

| Text | Line | Component context | Notes |
|---|---|---|---|
| `{madLib.title}` | 355 | `<p className="madlibs-display-eyebrow">` | Dynamic — from `showConfig.madLibs[].title` |
| `{madLib.prompt}` | 356 | `<h1 className="madlibs-display-prompt">` | Dynamic — from `showConfig.madLibs[].prompt` |
| `Scan to vote: ` + `{stripScheme(voteUrl)}` | 358 | `<p className="madlibs-display-join">` | Static label + dynamic URL in `<strong>` |
| `{slot.type}` | 367 | `<span className="madlibs-display-field-type">` | Dynamic per slot |
| `{slot.label}` | 368 | `<span className="madlibs-display-field-sublabel">` | Dynamic per slot |

---

### MadLibsDisplayPage — REVEAL mode (`DisplayReveal`)

| Text | Line | Component context | Notes |
|---|---|---|---|
| `` `Preview · ${madLib.title}` `` | 451 | `<p className="madlibs-display-eyebrow">` | Preview mode only (`?mode=preview`) |
| `{madLib.title}` | 451 | `<p className="madlibs-display-eyebrow">` | Live mode |
| `The people have voted.` | 453 | `<h1 className="madlibs-display-reveal-title">` | |
| `{slot.type}` | 463 | `<p className="madlibs-display-reveal-card-type">` | Dynamic per slot |
| `{winnerFor(i)}` | 464 | `<p className="madlibs-display-reveal-card-winner">` | Dynamic — winning option text; falls back to `"—"` (line 433) when no votes cast in live mode |
| `—` | 433 | Return value of `winnerFor()` | Fallback when `!t.hasVotes` and `!isPreview` |
| `{paragraph}` | 474 | `<p>` inside `.madlibs-display-reveal-paragraph` | Dynamic — assembled template string; conditional |

---

### MadLibsDisplayPage — Footer

| Text | Line | Component context | Notes |
|---|---|---|---|
| `← Back to show` | 262 | `<Link>` text | Link to `/shows/:showId`; always visible on display page |

---

### MadLibsAdminPanel — Guard / loading states
`platform/src/components/admin/MadLibsAdminPanel.tsx`

> **Note:** Not rendered for Honey Heist in the current `AdminPage.tsx`. Would show "No Mad Libs defined for this show." since `honey-heist.system.json` has no `showConfig.madLibs[]`.

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Mad Libs results` | 301 | `<h2>` — configError guard | |
| `{configError}` | 302 | `<p style={{color:'tomato'}}>` | Dynamic error text |
| `Mad Libs results` | 309 | `<h2>` — loading guard | |
| `Loading…` | 310 | `<p>` — loading guard | |
| `Mad Libs results` | 317 | `<h2>` — empty state | |
| `No Mad Libs defined for this show.` | 319 | `<p>` — empty state | **This is what Honey Heist would show** |

---

### MadLibsAdminPanel — Header

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Mad Libs results · {showName ?? showId}` | 327 | `<h2>` | Dynamic — `showName` prop |
| `{votes.length} vote` / `{votes.length} votes` | 329–330 | `<p className="admin-madlibs-meta">` | Singular/plural |
| `{uniqueVoters} voter` / `{uniqueVoters} voters` | 330–331 | same `<p>` | Singular/plural |
| ` · 🔒 voting closed by admin` | 332 | same `<p>` — suffix | Conditional on `isManualLocked` |

---

### MadLibsAdminPanel — Action buttons

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Pushing…` | 346 | `<button className="admin-madlibs-push">` | While `pushBusy === true` |
| `📡 Live on audience phones` | 348 | same button | When `isPushedToAudience === true` |
| `` `📡 Push "${current?.title ?? '—'}" to audience` `` | 349 | same button | Default state; `current.title` is dynamic |
| `⏸ Idle audience` | 358 | `<button className="admin-madlibs-push-clear">` | title: `"Clear the active Mad Lib (audience phones go idle)."` |
| `Working…` | 371 | `<button className="admin-madlibs-lock">` | While `lockBusy === true` |
| `🔓 Reopen voting` | 373 | same button | When `isManualLocked === true` |
| `🔒 Close voting now` | 374 | same button | When `isManualLocked === false` |
| `Clearing…` | 384 | `<button className="admin-madlibs-danger">` | While `clearStatus.kind === 'clearing'` |
| `` `Clear all votes for "${current?.title ?? '—'}"` `` | 385–386 | same button | `current.title` dynamic |
| `🚨 Reset everything` | 393 | `<button className="admin-madlibs-danger admin-madlibs-panic">` | title: `"Show-day panic button: clears all votes AND reopens voting."` |

---

### MadLibsAdminPanel — Status messages

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Cleared {count} vote` / `Cleared {count} votes.` | 399–401 | `<span className="admin-madlibs-status">` | Singular/plural; auto-clears after 4 s |
| `{clearStatus.message}` | 405 | `<span className="admin-madlibs-status admin-madlibs-status-error">` | Dynamic error from caught exception |
| `Lock failed: {lockError}` | 410 | same error span | Dynamic |
| `Push failed: {pushError}` | 415 | same error span | Dynamic |

---

### MadLibsAdminPanel — Field display

| Text | Line | Component context | Notes |
|---|---|---|---|
| `[{slot.type}]` | 460 | `<span className="admin-madlibs-slot-type">` in `<h3>` | Brackets are literal; type is dynamic |
| `{slot.label}` | 461 | `<span className="admin-madlibs-slot-label">` in `<h3>` | Dynamic |
| `{count} · {pct}%` | 480 | `<span className="admin-madlibs-option-count">` | Dynamic tally |
| ` · winner` | 481 | same span — suffix | Conditional on `isWinner` |
| `No votes yet.` | 495 | `<p className="admin-madlibs-empty">` | Shown when `!tally?.hasVotes` |
| `▾ Individual submissions ({slotVotes.length})` | 509–510 | `<button>` — toggle (expanded) | |
| `▸ Individual submissions ({slotVotes.length})` | 509–510 | `<button>` — toggle (collapsed) | |

---

### MadLibsAdminPanel — `window.confirm` / `window.alert` dialogs

| Text | Line | Trigger |
|---|---|---|
| `Delete every vote for "{current.title}"? This cannot be undone.` | 165 | Clear all votes button |
| `Clear active Mad Lib (audience phones go idle)?` | 199 | Idle audience button |
| `Push "{label}" to audience phones now?` | 201 | Push to audience button; `label` is Mad Lib title |
| `CLOSE voting for "{current.title}"? Audience will see this immediately.` | 223–225 | Lock toggle — closing |
| `REOPEN voting for "{current.title}"? Audience will see this immediately.` | 223–225 | Lock toggle — reopening |
| `RESET "{current.title}"?\n\nThis will:\n  • Delete every vote\n  • Reopen voting (clear manual lock)\n\nUse this as the show-day panic button. Cannot be undone.` | 247 | Reset everything button |
| `Delete this single vote?\n  • {optionLabel}\n  • voter: {vote.voterId}\n\nThe voter can re-submit if voting is still open.` | 281 | Per-vote delete button |
| `Could not delete that vote: {err.message \| 'Unknown error'}` | 290 | `window.alert` on vote-delete failure |

---

### AdminPage — Auth / entry strings
`platform/src/pages/AdminPage.tsx`

> **Flag:** These are generic platform auth strings, not Honey Heist–specific. Included because this is the only route into `NpcAdminPanel`.

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Checking your admin status…` | 23 | `<p className="reserve-subtitle">` — loading guard | While `isLoading \|\| isAdminLoading` |
| `Admin sign-in required` | 31 | `<h1>` | Not signed in |
| `Sign in with the Google account whose email is on the admin allowlist.` | 33–35 | `<p className="reserve-subtitle">` | |
| `Sign in with Google` | 39 | `<button className="btn-primary btn-block">` | |
| `Not an admin` | 50 | `<h1>` | Signed in but not on allowlist |
| `Signed in as {user.email}, but this email isn't on the admin allowlist (config/admins.emails). Add it from another admin's session, or sign in with a different account.` | 52–56 | `<p>` | `user.email` is dynamic |
| `← Back home` | 57 | `<Link>` | |
| `GM Panel` | 68 | `<h1>` | Authenticated admin landing |
| `Signed in as {user.displayName \| user.email}.` | 70 | `<p className="admin-welcome">` | Dynamic |
| `No NPC shows configured.` | 84 | `<p className="npc-admin-panel__empty">` | Fallback when `npcShows.length === 0` |

---

### NpcAdminPanel — Guard / loading states
`platform/src/components/admin/NpcAdminPanel.tsx`

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Could not load system config for {showName}.` | 125 | `<p className="npc-admin-panel__error">` | `showName` dynamic |
| `Loading {showName}…` | 134 | `<p className="npc-admin-panel__loading">` | `showName` dynamic |

---

### NpcAdminPanel — Header

| Text | Line | Component context | Notes |
|---|---|---|---|
| `{showConfig.showName}` | 171 | `<h2 className="npc-admin-panel__title">` | Dynamic — `"Mad Libs Honey Heist"` |
| `{npcs.length} joined · {pendingBeats.length} pending · {modQueueCount} awaiting approval` | 173 | `<p className="npc-admin-panel__meta">` | Dynamic counts |

---

### NpcAdminPanel — Notebook batch controls

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Sending…` | 184 | `<button className="btn-secondary npc-admin-panel__send-notebooks">` | While `batchStatus === 'sending'` |
| `Send Notebooks to All` | 184 | same button | Idle state |
| `Dry run` | 192 | `<button className="btn-ghost npc-admin-panel__dry-run">` | title: `"Log the batch without sending — use on show day to rehearse"` |
| `{batchResult.queued} sent · {batchResult.skipped} skipped` | 197–198 | `<p className="npc-admin-panel__batch-result">` | Dynamic |
| ` · {batchResult.errors.length} errors (check console)` | 199 | same `<p>` — suffix | Conditional |
| `Batch failed. Check the function logs.` | 204 | `<p className="npc-admin-panel__batch-result npc-admin-panel__batch-result--error">` | |

---

### NpcAdminPanel — Tabs

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Roster ({npcs.length})` | 216 | `<button className="npc-admin-tab">` | Dynamic count |
| `Fire Stinger` | 217 | same button style | |
| `Mod Queue` | 218 | same button style | No count when `modQueueCount === 0` |
| `Mod Queue ({modQueueCount})` | 218 | same button style | When `modQueueCount > 0` |

---

### NpcAdminPanel — Empty state

| Text | Line | Component context | Notes |
|---|---|---|---|
| `No stingerQueue defined in system config.` | 239 | `<p className="npc-admin-panel__empty">` | Shown on Fire tab when `showConfig.stingerQueue` is absent |

---

### NpcAdminPanel — RosterTab

| Text | Line | Component context | Notes |
|---|---|---|---|
| `No one has joined yet.` | 263 | `<p className="npc-admin-panel__empty">` | Empty state |
| `Stinger →` | 323 | `<button className="npc-roster__fire-btn btn-secondary">` | title: `"Go to Fire Stinger tab"` |
| `…` | 331 | `<button className="npc-roster__archive-btn btn-ghost">` | While archiving |
| `Archive` | 331 | same button | Idle state |
| `✍` | 301 | `<span className="npc-roster__write-in-badge">` | title: `"Audience write-in"`; badge on write-in values |
| `Archive {npc.displayName}?\n\nThey will disappear from the live roster. The record is kept — never deleted.` | 268 | `window.confirm` | `npc.displayName` dynamic |
| `Archive failed. Check the console.` | 276 | `window.alert` | On archive failure |

---

### NpcAdminPanel — FireTab

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Stinger sent to {fired}.` | 400 | `<div className="npc-fire-tab__success">` | `fired` = NPC display name |
| `×` | 401 | `<button className="npc-fire-tab__dismiss">` | Dismiss success notice |
| `Who's getting the Stinger?` | 408 | `<label htmlFor="npc-select">` | NPC picker label |
| `— pick an NPC —` | 417 | `<option value="">` | Default/empty select option |
| ` Use a preset` | 435 | `<label>` — radio option | Note leading space (` Use a preset`) |
| ` Write my own` | 445 | `<label>` — radio option | Note leading space |
| `{preset.label}` | 464 | `<span className="npc-fire-tab__preset-label">` | **Flag: GM-facing only.** Dynamic from `stingerQueue.promptPresets[].label` (see Section 3) |
| `{preset.prompt}` | 465 | `<span className="npc-fire-tab__preset-prompt">` | **Flag: GM-facing preview of audience-facing prompt.** Dynamic from `stingerQueue.promptPresets[].prompt` (see Section 3) |
| `Type the prompt you want to send…` | 476 | `<textarea placeholder>` | Custom prompt mode |
| `Preview` | 484 | `<span className="npc-fire-tab__preview-label">` | Preview section label |
| `{selectedNpc.displayName} — "{promptText}"` | 486 | `<p>` in preview | Dynamic |
| `Response template: {stingerQueue.responseTemplate}` | 489 | `<p className="npc-fire-tab__preview-template">` | Dynamic — shows template string to GM |
| `Failed to fire stinger. Check the console.` | 495 | `<p className="npc-fire-tab__error">` | Fire error |
| `Firing…` | 503 | `<button className="btn-primary npc-fire-tab__fire-btn">` | While `firing === true` |
| `🎯 Fire Stinger` | 503 | same button | Idle state |

---

### NpcAdminPanel — ModTab

| Text | Line | Component context | Notes |
|---|---|---|---|
| `No responses waiting. Fire a Stinger and wait for the audience to respond.` | 541–542 | `<p className="npc-admin-panel__empty">` | Shown when `beats.length === 0 && approvedBeats.length === 0` |
| `Awaiting review` | 547 | `<h3 className="npc-mod-tab__section-heading">` | |
| `"{beat.promptText}"` | 553 | `<span className="npc-mod-queue__prompt">` | Dynamic — audience-facing prompt text, quoted |
| `{beat.response.assembledText}` | 559 | `<p className="npc-mod-queue__response">` | Dynamic — assembled stinger response |
| `✓ Approve` | 564 | `<button className="btn-primary npc-mod-queue__approve">` | |
| `✕ Reject` | 571 | `<button className="btn-ghost npc-mod-queue__reject">` | |
| `Waiting for response…` | 579 | `<p className="npc-mod-queue__waiting">` | When beat has no response yet |
| `Live feed` | 589 | `<h3 className="npc-mod-tab__section-heading">` | |
| `{beat.response.assembledText}` | 597 | `<p className="npc-mod-queue__response">` | Dynamic — approved stinger text in live feed |
| `Clear from feed` | 604 | `<button className="btn-ghost npc-mod-queue__clear">` | Idle state |
| `…` | 605 | same button | While `clearing === beat.id` |

---

### StingerPrompt — Audience overlay
`platform/src/components/StingerPrompt.tsx`

Shown as a full-screen overlay (`role="dialog"`) when the GM fires a stinger at an NPC.

| Text | Line | Component context | Notes |
|---|---|---|---|
| `Stinger` | 52 | `<p className="stinger-prompt__label">` | Fixed section label |
| `{beat.promptText}` | 53 | `<p className="stinger-prompt__question">` | Dynamic — the prompt text the GM fired (from `promptPresets[].prompt`); see Section 3 |
| `{slot.type}` | 61 | `<span className="stinger-slot__type">` in `<legend>` | Dynamic per slot; e.g. `"VERB (past tense)"`, `"NOUN"`, `"PLACE"`, `"ADJECTIVE"` |
| `Sending…` | 97 | `<button className="stinger-prompt__submit">` | While `submitting === true` |
| `Send it` | 97 | same button | Idle state |
| `{assembleText()}` | 102 | `<p className="stinger-prompt__success-text">` | Dynamic — assembled stinger sentence shown post-submit |
| `Waiting for the GM to approve.` | 103 | `<p className="stinger-prompt__success-sub">` | Post-submit confirmation |
| `Got it` | 104 | `<button className="stinger-prompt__dismiss">` | Dismisses overlay after submission |

---

## 2. Mad Libs Word Banks

All option labels sourced verbatim from `src/systems/honey-heist.system.json`.

---

### NPC Creation Fields (`showConfig.npcCreation.fields`)

Displayed in `FieldBlock` during `phase === 'create'`. Each field shows as a fieldset with a `<legend>` (the `type`) and a radio group (the `options`).

---

#### Field: `adjective` — personal field
- **Category label shown to user (`field.type`):** `ADJECTIVE`
- **UI field label (`field.label`):** `Give me an adjective.`
- **Options:**
  - `suspicious`
  - `licensed`
  - `enormous`
  - `chill`
- **File:** `src/systems/honey-heist.system.json` lines 160–165
- **Setting:** All settings (personal field — not aggregated)

---

#### Field: `job_title` — personal field
- **Category label shown to user (`field.type`):** `JOB TITLE`
- **UI field label (`field.label`):** `Give me a job title.`
- **Options:**
  - `manager`
  - `inspector`
  - `consultant`
  - `ghost`
- **File:** `src/systems/honey-heist.system.json` lines 166–171
- **Setting:** All settings (personal field)

---

#### Field: `tagline` — personal field
- **Category label shown to user (`field.type`):** `ADJECTIVE`
- **UI field label (`field.label`):** `One more adjective.`
- **Options:**
  - `notorious`
  - `retired`
  - `haunted`
  - `unlicensed`
- **File:** `src/systems/honey-heist.system.json` lines 172–177
- **Setting:** All settings (personal field)

---

#### Field: `noun` — personal field
- **Category label shown to user (`field.type`):** `NOUN`
- **UI field label (`field.label`):** `Give me a noun.`
- **Options:**
  - `tourist`
  - `stranger`
  - `journalist`
  - `plus-one`
- **File:** `src/systems/honey-heist.system.json` lines 178–183
- **Setting:** All settings (personal field)

---

#### Field: `setting` — world field
- **Category label shown to user (`field.type`):** `PLACE`
- **UI field label (`field.label`):** `Give me a place.`
- **Options:**
  - `a theme park`
  - `a space station`
  - `a time loop`
  - `a film set`
- **File:** `src/systems/honey-heist.system.json` lines 184–199
- **Setting:** World-voted — the winning option determines the setting for all NPCs
- **Note:** These four options map to the original Honey Heist themes (Theme Park / Outer Space / Time Travel / Monster Movie). The `_comment` in the JSON notes this explicitly.

---

#### Field: `prize` — world field
- **Category label shown to user (`field.type`):** `NOUN`
- **UI field label (`field.label`):** `Give me a noun.`
- **Options:**
  - `the mascot`
  - `old honey`
  - `a film reel`
  - `something alive`
- **File:** `src/systems/honey-heist.system.json` lines 200–211
- **Setting:** World-voted — the winning option determines the prize for the heist

---

### Stinger Response Slots — Default (`stingerQueue.responseSlots`)

Fallback slots used when a custom prompt is fired or when no preset-specific slots are defined. Displayed in `StingerPrompt` component. The audience sees only `slot.type` in the legend; `slot.label` is not shown to audience (it's present in FireTab preview only).

---

#### Default slot: `verb`
- **Type shown to audience (`slot.type`):** `VERB (past tense)`
- **Label (admin FireTab only, `slot.label`):** `What you did`
- **Options:**
  - `knocked`
  - `ate`
  - `revealed`
  - `ignored`
- **File:** `src/systems/honey-heist.system.json` lines 221–226

---

#### Default slot: `noun`
- **Type shown to audience:** `NOUN`
- **Label (admin only):** `What you affected`
- **Options:**
  - `jar`
  - `disguise`
  - `plan`
  - `hat`
- **File:** `src/systems/honey-heist.system.json` lines 227–232

---

#### Default slot: `place`
- **Type shown to audience:** `PLACE`
- **Label (admin only):** `Where this happened`
- **Options:**
  - `elevator`
  - `bathroom`
  - `lobby`
  - `timeline`
- **File:** `src/systems/honey-heist.system.json` lines 233–238

---

#### Default slot: `adjective`
- **Type shown to audience:** `ADJECTIVE`
- **Label (admin only):** `How it is now`
- **Options:**
  - `chaotic`
  - `improved`
  - `on fire`
  - `illegal`
- **File:** `src/systems/honey-heist.system.json` lines 239–244

---

### Stinger Response Slots — Preset: `worst-moment`

Preset label (admin only): `Walk in at the worst moment`

---

#### Slot: `verb`
- **Type shown to audience:** `VERB (past tense)`
- **Label (admin only):** `What you did`
- **Options:**
  - `photographed`
  - `livestreamed`
  - `narrated`
  - `auctioned`
- **File:** `src/systems/honey-heist.system.json` lines 252–257

---

#### Slot: `noun`
- **Type shown to audience:** `NOUN`
- **Label (admin only):** `What you affected`
- **Options:**
  - `mascot head`
  - `escape route`
  - `security override`
  - `emergency honey`
- **File:** `src/systems/honey-heist.system.json` lines 258–263

---

#### Slot: `place`
- **Type shown to audience:** `PLACE`
- **Label (admin only):** `Where this is now`
- **Options:**
  - `main stage`
  - `exhibit hall B`
  - `feeds`
  - `vault anteroom`
- **File:** `src/systems/honey-heist.system.json` lines 264–269

---

#### Slot: `adjective`
- **Type shown to audience:** `ADJECTIVE`
- **Label (admin only):** `How it is now`
- **Options:**
  - `trending`
  - `a crime scene`
  - `very witnessed`
  - `legally complicated`
- **File:** `src/systems/honey-heist.system.json` lines 270–275

---

### Stinger Response Slots — Preset: `witness`

Preset label (admin only): `See something you shouldn't have`

---

#### Slot: `verb`
- **Type shown to audience:** `VERB (past tense)`
- **Label (admin only):** `What you did with it`
- **Options:**
  - `described`
  - `reported`
  - `identified`
  - `sketched`
- **File:** `src/systems/honey-heist.system.json` lines 287–292

---

#### Slot: `noun`
- **Type shown to audience:** `NOUN`
- **Label (admin only):** `What you saw`
- **Options:**
  - `bear disguise`
  - `honey drop`
  - `whole plan`
  - `backup signal`
- **File:** `src/systems/honey-heist.system.json` lines 293–298

---

#### Slot: `place`
- **Type shown to audience:** `PLACE`
- **Label (admin only):** `Where it ended up`
- **Options:**
  - `front page`
  - `official record`
  - `security office`
  - `group chat`
- **File:** `src/systems/honey-heist.system.json` lines 299–304

---

#### Slot: `adjective`
- **Type shown to audience:** `ADJECTIVE`
- **Label (admin only):** `How it is now`
- **Options:**
  - `documented`
  - `no longer deniable`
  - `on the news`
  - `a statement`
- **File:** `src/systems/honey-heist.system.json` lines 305–310

---

### Stinger Response Slots — Preset: `accident`

Preset label (admin only): `Make it worse`

---

#### Slot: `verb`
- **Type shown to audience:** `VERB (past tense)`
- **Label (admin only):** `What you did`
- **Options:**
  - `announced`
  - `helped`
  - `narrated`
  - `fixed`
- **File:** `src/systems/honey-heist.system.json` lines 317–322

---

#### Slot: `noun`
- **Type shown to audience:** `NOUN`
- **Label (admin only):** `What you touched`
- **Options:**
  - `backup plan`
  - `wrong bear`
  - `whole thing`
  - `getaway car`
- **File:** `src/systems/honey-heist.system.json` lines 323–328

---

#### Slot: `place`
- **Type shown to audience:** `PLACE`
- **Label (admin only):** `What paid for it`
- **Options:**
  - `exits`
  - `main stage`
  - `parking structure`
  - `timeline`
- **File:** `src/systems/honey-heist.system.json` lines 329–334

---

#### Slot: `adjective`
- **Type shown to audience:** `ADJECTIVE`
- **Label (admin only):** `How it is now`
- **Options:**
  - `worse somehow`
  - `a podcast`
  - `on fire`
  - `permanent`
- **File:** `src/systems/honey-heist.system.json` lines 335–340

---

### Stinger Response Slots — Preset: `distraction`

Preset label (admin only): `Be the distraction`

---

#### Slot: `verb`
- **Type shown to audience:** `VERB (past tense)`
- **Label (admin only):** `What you did`
- **Options:**
  - `performed`
  - `announced`
  - `narrated`
  - `sang`
- **File:** `src/systems/honey-heist.system.json` lines 347–352

---

#### Slot: `noun`
- **Type shown to audience:** `NOUN`
- **Label (admin only):** `What it was`
- **Options:**
  - `interpretive fall`
  - `beekeeper credentials`
  - `emergency dance`
  - `exit speech`
- **File:** `src/systems/honey-heist.system.json` lines 353–358

---

#### Slot: `place`
- **Type shown to audience:** `PLACE`
- **Label (admin only):** `Where it landed`
- **Options:**
  - `stage`
  - `exhibit hall B`
  - `front desk`
  - `parking lot`
- **File:** `src/systems/honey-heist.system.json` lines 359–364

---

#### Slot: `adjective`
- **Type shown to audience:** `ADJECTIVE`
- **Label (admin only):** `How it is now`
- **Options:**
  - `still happening`
  - `too successful`
  - `a thing now`
  - `technically a performance`
- **File:** `src/systems/honey-heist.system.json` lines 365–370

---

## 3. Setting Flavor Text

Prose, templates, and narrative prompts. All setting context is determined by the world-voted `setting` field — the Honey Heist show does not pre-split copy by setting in the current implementation. All four settings (`a theme park`, `a space station`, `a time loop`, `a film set`) use the same templates; the winning setting word is substituted in at runtime.

---

### Show identity strings
`src/lib/shows/mad-libs-honey-heist.show.ts` / `src/systems/honey-heist.system.json`

| String | Source | Line | Where it surfaces |
|---|---|---|---|
| `Mad Libs Honey Heist` | `honey-heist.system.json` `showConfig.showName` | 141 | NpcCreationPage eyebrow (create, reveal, my-npc phases); NpcAdminPanel header; MadLibsDisplayPage title (IDLE, config-error states) |
| `Mad Libs Honey Heist` | `mad-libs-honey-heist.show.ts` `show.name` | 11 | MadLibsDisplayPage IDLE h1; ShowPage; ShowsIndexPage |
| `Mad Libs format. The audience writes the prompts. The cast plays it live.` | `mad-libs-honey-heist.show.ts` `show.description` | 17 | ShowPage — not in the Mad Libs flow itself |

---

### NPC display name template
`src/systems/honey-heist.system.json` line 157

```
{adjective} {job_title}, {tagline}
```

- **Where it surfaces:** Composed into `npc.displayName` at NPC creation time; rendered in `NpcCard` (`<p className="npc-card__name">`), in the reveal screen (`<p className="join-reveal__name">`), and throughout the admin panel wherever NPC names appear.
- **Field substitution:** `{adjective}`, `{job_title}`, `{tagline}` are filled from the audience member's selections in the personal fields.
- **Example output (with default options):** `suspicious manager, notorious`

---

### NPC reveal sentence template
`src/systems/honey-heist.system.json` line 158

```
A {adjective} {job_title}, reportedly {tagline}, attending {setting} as a {noun}.
```

- **Where it surfaces:** Composed by `composeFromWords()` and rendered in the reveal screen (`<p className="join-reveal__sentence">`). Also used as `revealSentence` in the character-saved email (non-blocking send in `handleSaveEmail()`).
- **Field substitution:** All six NPC creation fields.
- **Example output:** `A suspicious manager, reportedly notorious, attending a theme park as a tourist.`
- **Note:** `{setting}` is the world-voted value — every audience member's reveal sentence uses the same setting word, determined by aggregate votes.

---

### Stinger response template
`src/systems/honey-heist.system.json` line 219

```
I {verb} the {noun} and now the {place} is {adjective}.
```

- **Where it surfaces:** Used as `beat.responseTemplate` — passed through `assembleText()` in `StingerPrompt` and rendered in `<p className="stinger-prompt__success-text">` after submission. Also rendered in the GM's FireTab preview (`<em>` in `.npc-fire-tab__preview-template`), in ModTab (`<p className="npc-mod-queue__response">`), in the audience's "Your Stingers" list (`<span className="join-my-stingers__text">`), and in the projector's live feed (`<span className="madlibs-display-stinger-feed-text">`).
- **Field substitution:** `{verb}`, `{noun}`, `{place}`, `{adjective}` — filled from the stinger response slots for the specific preset used.
- **Example output (distraction preset):** `I performed the interpretive fall and now the stage is still happening.`

---

### Stinger prompt texts
Pushed live by the GM via `triggerBeat()` as `beat.promptText`. Rendered verbatim in `StingerPrompt` (`<p className="stinger-prompt__question">`) on the audience member's phone and quoted in the ModTab. All prompts use the same response template and slot structure; the specific word bank depends on which preset the GM selected.

---

#### Preset: `worst-moment`
- **GM label (admin only):** `Walk in at the worst moment`
- **Prompt text (audience-facing):** `You just walked into the worst possible moment. What do you do?`
- **File:** `src/systems/honey-heist.system.json` lines 247–249

---

#### Preset: `witness`
- **GM label (admin only):** `See something you shouldn't have`
- **Prompt text (audience-facing):** `You saw something you absolutely should not have seen. Now what?`
- **File:** `src/systems/honey-heist.system.json` lines 278–283

---

#### Preset: `accident`
- **GM label (admin only):** `Make it worse`
- **Prompt text (audience-facing):** `You tried to stay out of it. That's over. How did you accidentally make it worse?`
- **File:** `src/systems/honey-heist.system.json` lines 309–311

---

#### Preset: `distraction`
- **GM label (admin only):** `Be the distraction`
- **Prompt text (audience-facing):** `The bears need three seconds and a distraction. You're the only one here. Go.`
- **File:** `src/systems/honey-heist.system.json` lines 343–345
