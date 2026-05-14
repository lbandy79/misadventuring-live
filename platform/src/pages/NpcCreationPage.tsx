/**
 * NpcCreationPage — /shows/:showId/join
 *
 * Blind Mad Libs collection → reveal → persistent NPC view.
 * No auth, no code gate. Device token is the identity.
 *
 * Flow:
 *   1. Load showConfig from system.json
 *   2. Check for existing NPC by device token (returning visitor)
 *   3a. Existing NPC → my-npc view (can edit)
 *   3b. No NPC → blind word-collection form (no sentence context shown)
 *   4. Submit → reveal screen (words slammed into brand-voice template)
 *   5. "Got it. I'm in." → my-npc view + save-your-character section
 *   6. Save (email + notebook opt-in) → fires character-saved email → confirmation
 *   7. Stinger overlay when the GM fires a Beat at this NPC
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getShow } from '@mtp/lib';
import {
  getOrCreateDeviceToken,
  getNpcByDeviceToken,
  createNpc,
  updateNpc,
  saveNpcEmail,
  castWorldVote,
  subscribeToBeatsForNpc,
  subscribeToApprovedBeats,
  type NpcProfile,
  type Beat,
  type BeatResponseSlot,
} from '../../../src/lib/npcs/npcApi';
import { upsertAudienceProfile } from '../../../src/lib/audience/audienceApi';
import { composeFromWords, type CollectedWord } from '../../../src/lib/npcs/composeWords';
import { sendCharacterSavedEmail } from '../lib/email/emailService';
import { NpcCard } from '../components/NpcCard';
import { StingerPrompt } from '../components/StingerPrompt';

// ─── Local types ──────────────────────────────────────────────────────────────

interface NpcFieldDef {
  id: string;
  type: string;
  fieldType: 'personal' | 'world';
  label: string;
  options: string[];
}

interface ShowConfig {
  showId: string;
  showName: string;
  theme: {
    beatLabel: string;
    campaignId: string;
    primaryColor: string;
    accentColor: string;
  };
  npcCreation: {
    displayNameTemplate: string;
    revealTemplate?: string;
    fields: NpcFieldDef[];
  };
  stingerQueue?: {
    responseTemplate: string;
    responseSlots: BeatResponseSlot[];
  };
}

type PagePhase = 'loading' | 'create' | 'reveal' | 'my-npc';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NpcCreationPage() {
  const { showId } = useParams<{ showId: string }>();
  const show = useMemo(() => (showId ? getShow(showId) : undefined), [showId]);

  const [phase, setPhase] = useState<PagePhase>('loading');
  const [showConfig, setShowConfig] = useState<ShowConfig | null>(null);
  const [configError, setConfigError] = useState(false);

  const [myNpc, setMyNpc] = useState<NpcProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [customName, setCustomName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldWriteIns, setFieldWriteIns] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live beats
  const [myBeats, setMyBeats] = useState<Beat[]>([]);
  const [approvedBeats, setApprovedBeats] = useState<Beat[]>([]);

  // Save-your-character section
  const [npcEmail, setNpcEmail] = useState('');
  const [optedInForNotebook, setOptedInForNotebook] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [savedEmailAddress, setSavedEmailAddress] = useState<string | null>(null);
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);

  // Stinger overlay dismiss — tracks the last beat the user manually closed
  const [dismissedBeatId, setDismissedBeatId] = useState<string | null>(null);

  // ── Load system.json ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!show) return;
    (async () => {
      try {
        const mod = await import(`../../../src/systems/${show.systemId}.system.json`);
        const raw = mod.default ?? mod;
        if (!raw?.showConfig?.npcCreation) {
          setConfigError(true);
          return;
        }
        setShowConfig(raw.showConfig as ShowConfig);
      } catch {
        setConfigError(true);
      }
    })();
  }, [show]);

  // ── Check for returning device ─────────────────────────────────────────────

  const firestoreShowId = showConfig?.showId ?? null;

  useEffect(() => {
    if (!firestoreShowId) return;
    const token = getOrCreateDeviceToken();
    getNpcByDeviceToken(firestoreShowId, token).then((existing) => {
      if (existing && !existing.isArchived) {
        setMyNpc(existing);
        setPhase('my-npc');
      } else {
        setPhase('create');
      }
    });
  }, [firestoreShowId]);

  // ── Beats subscriptions ────────────────────────────────────────────────────

  useEffect(() => {
    if (!myNpc || !firestoreShowId) return;

    const unsubNpc = subscribeToBeatsForNpc(myNpc.id, (beats) => {
      setMyBeats(beats);
    });

    const unsubShow = subscribeToApprovedBeats(firestoreShowId, (beats) => {
      setApprovedBeats(beats);
    });

    return () => {
      unsubNpc();
      unsubShow();
    };
  }, [myNpc?.id, firestoreShowId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((fieldId: string, value: string, isWriteIn: boolean) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    setFieldWriteIns((prev) => {
      if (!isWriteIn) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return { ...prev, [fieldId]: true };
    });
  }, []);

  async function handleSubmit() {
    if (!showConfig || submitting) return;
    setSubmitError(null);

    const fields = showConfig.npcCreation.fields;
    const allFilled = fields.every((f) => fieldValues[f.id]) && customName.trim().length > 0;
    if (!allFilled) {
      setSubmitError('Fill in every blank first.');
      return;
    }

    setSubmitting(true);
    try {
      const token = getOrCreateDeviceToken();
      const displayName = customName.trim();
      const writeIns = Object.keys(fieldWriteIns).length > 0 ? fieldWriteIns : undefined;

      let saved: NpcProfile;
      if (myNpc) {
        await updateNpc(myNpc.id, { displayName, fieldValues, fieldWriteIns: writeIns });
        saved = { ...myNpc, displayName, fieldValues, fieldWriteIns: writeIns };
      } else {
        saved = await createNpc({
          showId: showConfig.showId,
          systemId: show!.systemId,
          displayName,
          fieldValues,
          fieldWriteIns: writeIns,
          deviceToken: token,
        });
      }

      // Cast world votes
      const worldFields = fields.filter((f) => f.fieldType === 'world');
      await Promise.all(
        worldFields.map((f) =>
          castWorldVote({
            showId: showConfig.showId,
            fieldId: f.id,
            optionIndex: f.options.indexOf(fieldValues[f.id]),
            optionText: fieldValues[f.id],
            deviceToken: token,
          }),
        ),
      );

      setMyNpc(saved);
      setIsEditing(false);
      // Edit flow skips reveal (they've already seen it once)
      setPhase(isEditing ? 'my-npc' : 'reveal');
    } catch (err) {
      setSubmitError('Something went sideways. Try again?');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing() {
    if (!myNpc) return;
    setCustomName(myNpc.displayName);
    setFieldValues(myNpc.fieldValues);
    setFieldWriteIns(myNpc.fieldWriteIns ?? {});
    setIsEditing(true);
    setPhase('create');
  }

  async function handleSaveEmail() {
    if (!myNpc || !showConfig || emailSaving) return;
    const trimmed = npcEmail.trim();
    if (!trimmed) return;
    setEmailSaveError(null);
    setEmailSaving(true);
    try {
      const magicToken = crypto.randomUUID();
      const accessCode = generateAccessCode();

      const fields = showConfig.npcCreation.fields;
      const words: CollectedWord[] = fields.map((f) => ({
        id: f.id,
        type: f.type,
        value: myNpc.fieldValues[f.id] ?? '',
        isWriteIn: myNpc.fieldWriteIns?.[f.id] ?? false,
      }));
      const revealSentence = showConfig.npcCreation.revealTemplate
        ? composeFromWords(showConfig.npcCreation.revealTemplate, words)
        : '';

      await saveNpcEmail(myNpc.id, trimmed);
      await upsertAudienceProfile({
        email: trimmed,
        npc: {
          showId: myNpc.showId,
          showSlug: showId,  // URL slug for /return routing
          npcId: myNpc.id,
          savedAt: new Date().toISOString(),
          revealSentence,
          showName: showConfig.showName,
          characterName: myNpc.displayName,
        },
        magicToken,
        accessCode,
        optedInForNotebook,
        optedInForAnnouncements: optedInForNotebook,
      });

      // Non-blocking — a send failure doesn't undo the save
      sendCharacterSavedEmail({
        recipient: trimmed,
        characterName: myNpc.displayName,
        revealSentence,
        magicToken,
        accessCode,
        showName: showConfig.showName,
      }).catch((err) => console.error('character-saved email failed:', err));

      setSavedEmailAddress(trimmed);
    } catch (err) {
      console.error('save character failed:', err);
      setEmailSaveError('Something went sideways. Try again.');
    } finally {
      setEmailSaving(false);
    }
  }

  // ── Guard states ─────────────────────────────────────────────────────────────

  if (!show || !showId) {
    return (
      <section className="page-card">
        <h1>Show not found</h1>
        <p><Link to="/shows">← Back to all shows</Link></p>
      </section>
    );
  }

  if (configError) {
    return (
      <section className="page-card">
        <h1>This show isn't ready yet.</h1>
        <p>The Mad Libs haven't been loaded. Check back closer to showtime.</p>
        <p><Link to={`/shows/${showId}`}>← Back to show page</Link></p>
      </section>
    );
  }

  if (phase === 'loading' || !showConfig) {
    return (
      <section className="page-card join-page">
        <p className="join-loading">Loading…</p>
      </section>
    );
  }

  const fields = showConfig.npcCreation.fields;
  const personalFields = fields.filter((f) => f.fieldType === 'personal');
  const worldFields = fields.filter((f) => f.fieldType === 'world');
  const allFilled = customName.trim().length > 0 && fields.every((f) => fieldValues[f.id]);

  const pendingBeat = myBeats.find((b) => b.status === 'pending' && b.id !== dismissedBeatId) ?? null;
  const myApprovedBeats = myBeats.filter((b) => b.status === 'approved');

  // ── Reveal screen ────────────────────────────────────────────────────────────

  if (phase === 'reveal' && myNpc && showConfig) {
    const words: CollectedWord[] = fields.map((f) => ({
      id: f.id,
      type: f.type,
      value: myNpc.fieldValues[f.id] ?? '',
      isWriteIn: myNpc.fieldWriteIns?.[f.id] ?? false,
    }));

    const revealSentence = showConfig.npcCreation.revealTemplate
      ? composeFromWords(showConfig.npcCreation.revealTemplate, words)
      : null;

    return (
      <section className="page-card join-page join-page--reveal">
        <header className="join-header">
          <p className="join-eyebrow">{showConfig.showName}</p>
          <h1 className="join-title">Here's who you are.</h1>
        </header>

        <div className="join-reveal">
          <p className="join-reveal__name">{myNpc.displayName}</p>
          {revealSentence && (
            <p className="join-reveal__sentence">{revealSentence}</p>
          )}
        </div>

        <button
          className="btn-primary join-reveal-cta"
          onClick={() => setPhase('my-npc')}
        >
          Got it. I'm in.
        </button>
      </section>
    );
  }

  // ── Create / Edit form ────────────────────────────────────────────────────────

  if (phase === 'create') {
    return (
      <section className="page-card join-page">
        <header className="join-header">
          <p className="join-eyebrow">{showConfig.showName}</p>
          <h1 className="join-title">
            {isEditing ? 'Change your answers' : 'Make yourself a character.'}
          </h1>
          {!isEditing && (
            <p className="join-subtitle">
              Pick one for each slot. Don't think too hard.
            </p>
          )}
        </header>

        <div className="join-form">
          <div className="join-name-field">
            <label className="join-name-field__label" htmlFor="npc-name">
              What do they call you?
            </label>
            <input
              id="npc-name"
              type="text"
              className="join-name-field__input"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter a name…"
              maxLength={80}
              autoComplete="off"
            />
          </div>

          {personalFields.map((field) => (
            <FieldBlock
              key={field.id}
              field={field}
              selected={fieldValues[field.id]}
              isWriteIn={fieldWriteIns[field.id] ?? false}
              onChange={handleFieldChange}
            />
          ))}

          {worldFields.length > 0 && (
            <>
              <div className="join-form__world-divider">
                <span>Everyone votes on these</span>
              </div>
              {worldFields.map((field) => (
                <FieldBlock
                  key={field.id}
                  field={field}
                  selected={fieldValues[field.id]}
                  isWriteIn={fieldWriteIns[field.id] ?? false}
                  onChange={handleFieldChange}
                />
              ))}
            </>
          )}

          {submitError && (
            <p className="join-form__error" role="alert">{submitError}</p>
          )}

          <button
            className="btn-primary join-submit"
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
          >
            {submitting
              ? 'Saving…'
              : isEditing
              ? 'Save changes'
              : "That's me. I'm in."}
          </button>

          {isEditing && (
            <button
              className="btn-ghost join-cancel"
              onClick={() => { setIsEditing(false); setPhase('my-npc'); }}
            >
              Never mind
            </button>
          )}
        </div>
      </section>
    );
  }

  // ── My NPC view (post-reveal) ─────────────────────────────────────────────

  const npcFieldDefs = fields.map((f) => ({ id: f.id, label: f.label, fieldType: f.fieldType }));

  return (
    <>
      {pendingBeat && !isEditing && (
        <StingerPrompt beat={pendingBeat} onDismiss={() => setDismissedBeatId(pendingBeat.id)} />
      )}

      <section className="page-card join-page join-page--my-npc">
        <header className="join-header">
          <p className="join-eyebrow">{showConfig.showName}</p>
          <h1 className="join-title">You're in.</h1>
          <p className="join-subtitle">Keep this tab open. The GM might call on you.</p>
        </header>

        {myNpc && (
          <NpcCard
            npc={myNpc}
            fields={npcFieldDefs}
            personalOnly={true}
            className="join-npc-card"
          />
        )}

        {myApprovedBeats.length > 0 && (
          <section className="join-my-stingers" aria-label="Your stingers">
            <h2 className="join-my-stingers__title">Your Stingers</h2>
            <ol className="join-my-stingers__list">
              {myApprovedBeats.map((beat) => (
                <li key={beat.id} className="join-my-stingers__item">
                  <span className="join-my-stingers__prompt">{beat.promptText}</span>
                  {beat.response && (
                    <span className="join-my-stingers__text">{beat.response.assembledText}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {approvedBeats.length > 0 && (
          <section className="join-feed" aria-label="Live stinger feed">
            <h2 className="join-feed__title">What's happening</h2>
            <ol className="join-feed__list">
              {approvedBeats.map((beat) => (
                <li key={beat.id} className="join-feed__item">
                  <span className="join-feed__name">{beat.npcDisplayName}</span>
                  {beat.response && (
                    <span className="join-feed__text">{beat.response.assembledText}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {savedEmailAddress ? (
          <p className="join-save-char__done">
            We sent a link to {savedEmailAddress}. Check your inbox to come back to your character any time.
          </p>
        ) : (
          <div className="join-save-char">
            <p className="join-save-char__heading">Save your character. Come back any show.</p>
            <div className="join-save-char__row">
              <input
                id="character-email"
                type="email"
                className="join-save-char__input"
                value={npcEmail}
                onChange={(e) => setNpcEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={120}
                disabled={emailSaving}
                autoComplete="email"
              />
              <button
                className="join-save-char__btn"
                onClick={handleSaveEmail}
                disabled={!npcEmail.trim() || emailSaving}
              >
                {emailSaving ? '…' : 'Save'}
              </button>
            </div>
            <label className="join-save-char__optin">
              <input
                type="checkbox"
                className="join-save-char__optin-check"
                checked={optedInForNotebook}
                onChange={(e) => setOptedInForNotebook(e.target.checked)}
                disabled={emailSaving}
              />
              Save my character AND send me my Misadventuring Notebook after each show.
            </label>
            {emailSaveError && (
              <p className="join-save-char__error" role="alert">{emailSaveError}</p>
            )}
          </div>
        )}

        <div className="join-edit-row">
          <button className="btn-ghost join-edit-btn" onClick={startEditing}>
            Change my answers
          </button>
        </div>
      </section>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 32-char alphabet removes visually ambiguous characters: O, 0, I, 1
const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAccessCode(length = 6): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => ACCESS_CODE_CHARS[b % ACCESS_CODE_CHARS.length]).join('');
}

// ─── FieldBlock ───────────────────────────────────────────────────────────────

function FieldBlock({
  field,
  selected,
  isWriteIn,
  onChange,
}: {
  field: NpcFieldDef;
  selected: string | undefined;
  isWriteIn: boolean;
  onChange: (id: string, value: string, isWriteIn: boolean) => void;
}) {
  const [writeInText, setWriteInText] = useState('');
  const [writeInActive, setWriteInActive] = useState(isWriteIn);

  function activateWriteIn() {
    setWriteInActive(true);
    if (writeInText) onChange(field.id, writeInText, true);
  }

  function handleWriteInChange(val: string) {
    setWriteInText(val);
    if (val.trim()) onChange(field.id, val.trim(), true);
  }

  function handlePresetSelect(opt: string) {
    setWriteInActive(false);
    onChange(field.id, opt, false);
  }

  return (
    <fieldset className={`join-field join-field--${field.fieldType}`}>
      <legend className="join-field__legend">
        <span className="join-field__type">{field.type}</span>
        {field.fieldType === 'world' && (
          <span className="join-field__world-tag">everyone votes</span>
        )}
      </legend>

      <div className="join-field__options" role="radiogroup">
        {field.options.map((opt) => (
          <label
            key={opt}
            className={[
              'join-field__option',
              !writeInActive && selected === opt ? 'join-field__option--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={!writeInActive && selected === opt}
              onChange={() => handlePresetSelect(opt)}
              className="join-field__radio"
            />
            {opt}
          </label>
        ))}

        {/* Write-in option */}
        {!writeInActive ? (
          <button
            type="button"
            className="join-field__write-in-toggle"
            onClick={activateWriteIn}
          >
            Write in…
          </button>
        ) : (
          <div className="join-field__write-in">
            <input
              type="text"
              className="join-field__write-in-input"
              value={writeInText}
              onChange={(e) => handleWriteInChange(e.target.value)}
              placeholder={`Your own ${field.type.toLowerCase()}…`}
              maxLength={40}
              autoFocus
            />
            <button
              type="button"
              className="join-field__write-in-cancel"
              onClick={() => {
                setWriteInActive(false);
                setWriteInText('');
                if (!writeInActive) return;
                // Clear write-in if there was a preset selected before
                onChange(field.id, selected ?? '', false);
              }}
            >
              ← Presets
            </button>
          </div>
        )}
      </div>
    </fieldset>
  );
}
