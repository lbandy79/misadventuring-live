/**
 * NpcAdminPanel — GM controls for the NPC Mad Libs show format.
 *
 * Three tabs:
 *   Roster     — live list of joined NPCs with their field values
 *   Fire       — pick an NPC + prompt preset, push a Stinger (Beat)
 *   Mod Queue  — review responded Beats, approve or reject
 *
 * Loads showConfig from system.json to get the canonical showId,
 * stingerQueue promptPresets, responseTemplate, and responseSlots.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAuth } from 'firebase/auth';
import {
  subscribeToNpcs,
  subscribeToBeatsForShow,
  subscribeToWorldSelection,
  setWorldSelection,
  triggerBeat,
  moderateBeat,
  clearBeat,
  archiveNpc,
  setNpcDisplay,
  setAllNpcsDisplay,
  type NpcProfile,
  type Beat,
  type BeatResponseSlot,
  type WorldVoteTally,
  type WorldSelection,
} from '../../../../src/lib/npcs/npcApi';

const FUNCTIONS_BASE = 'https://us-central1-misadventuring-live.cloudfunctions.net';

// ─── Config types ──────────────────────────────────────────────────────────

interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
  responseTemplate?: string;
  responseSlots?: BeatResponseSlot[];
}

interface StingerQueueConfig {
  responseTemplate: string;
  responseSlots: BeatResponseSlot[];
  promptPresets: PromptPreset[];
}

interface NpcFieldDef {
  id: string;
  type: string;
  label: string;
  fieldType: 'personal' | 'world';
  options?: string[];
}

interface ShowConfig {
  showId: string;
  showName: string;
  npcCreation?: { fields: NpcFieldDef[] };
  stingerQueue?: StingerQueueConfig;
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface NpcAdminPanelProps {
  /** Show registry id — used to load the system.json. */
  showId: string;
  systemId: string;
  showName: string;
}

type Tab = 'roster' | 'fire' | 'world' | 'mod';

// ─── Panel ─────────────────────────────────────────────────────────────────

interface NotebookBatchResult {
  queued: number;
  skipped: number;
  errors: string[];
}

export default function NpcAdminPanel({ showId: registryId, systemId, showName }: NpcAdminPanelProps) {
  const [tab, setTab] = useState<Tab>('roster');
  const [showConfig, setShowConfig] = useState<ShowConfig | null>(null);
  const [configError, setConfigError] = useState(false);

  const [npcs, setNpcs] = useState<NpcProfile[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);

  const [batchStatus, setBatchStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [batchResult, setBatchResult] = useState<NotebookBatchResult | null>(null);

  // ── Load system.json ──────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const mod = await import(`../../../../src/systems/${systemId}.system.json`);
        const raw = mod.default ?? mod;
        if (!raw?.showConfig?.showId) { setConfigError(true); return; }
        setShowConfig(raw.showConfig as ShowConfig);
      } catch {
        setConfigError(true);
      }
    })();
  }, [systemId]);

  // ── Subscriptions (keyed on canonical Firestore showId) ───────────────────

  const firestoreShowId = showConfig?.showId;

  useEffect(() => {
    if (!firestoreShowId) return;
    const unsub = subscribeToNpcs(firestoreShowId, setNpcs);
    return unsub;
  }, [firestoreShowId]);

  useEffect(() => {
    if (!firestoreShowId) return;
    const unsub = subscribeToBeatsForShow(firestoreShowId, setBeats);
    return unsub;
  }, [firestoreShowId]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (configError) {
    return (
      <div className="npc-admin-panel">
        <p className="npc-admin-panel__error">
          Could not load system config for {showName}.
        </p>
      </div>
    );
  }

  if (!showConfig) {
    return (
      <div className="npc-admin-panel">
        <p className="npc-admin-panel__loading">Loading {showName}…</p>
      </div>
    );
  }

  const pendingBeats = beats.filter((b) => b.status === 'pending');
  const respondedBeats = beats.filter((b) => b.status === 'responded');
  const approvedBeats = beats.filter((b) => b.status === 'approved');
  const modQueueCount = respondedBeats.length;

  async function handleSendNotebooks(dryRun = false) {
    if (!showConfig || batchStatus === 'sending') return;
    setBatchStatus('sending');
    setBatchResult(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const resp = await fetch(`${FUNCTIONS_BASE}/sendNotebookBatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ showId: showConfig.showId, dryRun }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const result: NotebookBatchResult = await resp.json() as NotebookBatchResult;
      setBatchResult(result);
      setBatchStatus('done');
    } catch (err) {
      console.error('sendNotebookBatch failed:', err);
      setBatchStatus('error');
    }
  }

  return (
    <div className="npc-admin-panel">
      <div className="npc-admin-panel__header">
        <h2 className="npc-admin-panel__title">{showConfig.showName}</h2>
        <p className="npc-admin-panel__meta">
          {npcs.length} joined · {pendingBeats.length} pending · {modQueueCount} awaiting approval
        </p>
      </div>

      <div className="npc-admin-panel__notebooks">
        <button
          className="btn-secondary npc-admin-panel__send-notebooks"
          onClick={() => handleSendNotebooks(false)}
          disabled={batchStatus === 'sending'}
          title="Send character-saved emails to all opted-in audience members for this show"
        >
          {batchStatus === 'sending' ? 'Sending…' : 'Send Notebooks to All'}
        </button>
        <button
          className="btn-ghost npc-admin-panel__dry-run"
          onClick={() => handleSendNotebooks(true)}
          disabled={batchStatus === 'sending'}
          title="Log the batch without sending — use on show day to rehearse"
        >
          Dry run
        </button>
        {batchStatus === 'done' && batchResult && (
          <p className="npc-admin-panel__batch-result">
            {batchResult.queued} sent · {batchResult.skipped} skipped
            {batchResult.errors.length > 0 && (
              <> · {batchResult.errors.length} errors (check console)</>
            )}
          </p>
        )}
        {batchStatus === 'error' && (
          <p className="npc-admin-panel__batch-result npc-admin-panel__batch-result--error">
            Batch failed. Check the function logs.
          </p>
        )}
      </div>

      <div className="npc-admin-tabs">
        {(['roster', 'fire', 'world', 'mod'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`npc-admin-tab ${tab === t ? 'npc-admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'roster' && `Roster (${npcs.length})`}
            {t === 'fire' && 'Fire Stinger'}
            {t === 'world' && 'The World'}
            {t === 'mod' && `Mod Queue${modQueueCount > 0 ? ` (${modQueueCount})` : ''}`}
          </button>
        ))}
      </div>

      <div className="npc-admin-panel__body">
        {tab === 'roster' && (
          <RosterTab
            npcs={npcs}
            fields={showConfig.npcCreation?.fields ?? []}
            showId={showConfig.showId}
            onSelectForStinger={() => setTab('fire')}
          />
        )}
        {tab === 'fire' && showConfig.stingerQueue && (
          <FireTab
            npcs={npcs}
            showId={showConfig.showId}
            stingerQueue={showConfig.stingerQueue}
          />
        )}
        {tab === 'fire' && !showConfig.stingerQueue && (
          <p className="npc-admin-panel__empty">No stingerQueue defined in system config.</p>
        )}
        {tab === 'world' && (
          <WorldTab
            showId={showConfig.showId}
            npcs={npcs}
            worldFields={(showConfig.npcCreation?.fields ?? []).filter(
              (f) => f.fieldType === 'world',
            )}
          />
        )}
        {tab === 'mod' && (
          <ModTab beats={respondedBeats} approvedBeats={approvedBeats} />
        )}
      </div>
    </div>
  );
}

// ─── Roster tab ────────────────────────────────────────────────────────────

function RosterTab({
  npcs,
  fields,
  showId,
  onSelectForStinger,
}: {
  npcs: NpcProfile[];
  fields: NpcFieldDef[];
  showId: string;
  onSelectForStinger: (npc: NpcProfile) => void;
}) {
  const [archiving, setArchiving] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  if (npcs.length === 0) {
    return <p className="npc-admin-panel__empty">No one has joined yet.</p>;
  }

  async function handleArchive(npc: NpcProfile) {
    const confirmed = window.confirm(
      `Archive ${npc.displayName}?\n\nThey will disappear from the live roster. The record is kept — never deleted.`,
    );
    if (!confirmed) return;
    setArchiving(npc.id);
    try {
      await archiveNpc(npc.id);
    } catch (err) {
      console.error('archiveNpc failed:', err);
      window.alert('Archive failed. Check the console.');
    } finally {
      setArchiving(null);
    }
  }

  async function handleToggleDisplay(npc: NpcProfile) {
    setToggling(npc.id);
    try {
      await setNpcDisplay(npc.id, !npc.showOnDisplay);
    } catch (err) {
      console.error('setNpcDisplay failed:', err);
    } finally {
      setToggling(null);
    }
  }

  async function handleShowAll() {
    setBulkBusy(true);
    try {
      await setAllNpcsDisplay(showId, true);
    } catch (err) {
      console.error('setAllNpcsDisplay(true) failed:', err);
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleHideAll() {
    setBulkBusy(true);
    try {
      await setAllNpcsDisplay(showId, false);
    } catch (err) {
      console.error('setAllNpcsDisplay(false) failed:', err);
    } finally {
      setBulkBusy(false);
    }
  }

  const onScreenCount = npcs.filter((n) => n.showOnDisplay).length;

  return (
    <>
      <div className="npc-roster__bulk-actions">
        <button
          className="btn-secondary npc-roster__bulk-btn"
          onClick={handleShowAll}
          disabled={bulkBusy}
          title="Show every NPC on the projector display"
        >
          {bulkBusy ? '…' : 'Show All'}
        </button>
        <button
          className="npc-roster__bulk-btn npc-roster__bulk-btn--hide"
          onClick={handleHideAll}
          disabled={bulkBusy}
          title="Hide every NPC from the projector display"
        >
          {bulkBusy ? '…' : 'Hide All'}
        </button>
        {onScreenCount > 0 && (
          <span className="npc-roster__on-screen-count">
            {onScreenCount} on screen
          </span>
        )}
      </div>

      <ol className="npc-roster">
        {npcs.map((npc) => (
          <li key={npc.id} className="npc-roster__item">
            <div className="npc-roster__info">
              <span className="npc-roster__name">{npc.displayName}</span>
              <span className="npc-roster__fields">
                {fields
                  .filter((f) => f.fieldType === 'personal')
                  .map((f) => {
                    const val = npc.fieldValues[f.id];
                    if (!val) return null;
                    const isWriteIn = npc.fieldWriteIns?.[f.id] ?? false;
                    return (
                      <span key={f.id} className="npc-roster__field-val">
                        {val}
                        {isWriteIn && (
                          <span
                            className="npc-roster__write-in-badge"
                            title="Audience write-in"
                          >
                            ✍
                          </span>
                        )}
                      </span>
                    );
                  })
                  .filter(Boolean)
                  .reduce<ReactNode[]>((acc, el, i) => {
                    if (i > 0) acc.push(<span key={`sep-${i}`} className="npc-roster__sep"> · </span>);
                    acc.push(el);
                    return acc;
                  }, [])}
              </span>
            </div>
            <div className="npc-roster__actions">
              <button
                className={`npc-roster__visibility-btn${npc.showOnDisplay ? ' npc-roster__visibility-btn--on' : ''}`}
                onClick={() => handleToggleDisplay(npc)}
                disabled={toggling === npc.id || bulkBusy}
                title={npc.showOnDisplay ? 'Hide from projector' : 'Show on projector'}
              >
                {toggling === npc.id ? '…' : npc.showOnDisplay ? '📽 On screen' : 'Show'}
              </button>
              <button
                className="npc-roster__fire-btn btn-secondary"
                onClick={() => onSelectForStinger(npc)}
                title="Go to Fire Stinger tab"
              >
                Stinger →
              </button>
              <button
                className="npc-roster__archive-btn btn-ghost"
                onClick={() => handleArchive(npc)}
                disabled={archiving === npc.id}
                title="Archive this NPC (soft-delete, never hard-deleted)"
              >
                {archiving === npc.id ? '…' : 'Archive'}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

// ─── Fire tab ──────────────────────────────────────────────────────────────

function FireTab({
  npcs,
  showId,
  stingerQueue,
}: {
  npcs: NpcProfile[];
  showId: string;
  stingerQueue: StingerQueueConfig;
}) {
  const [selectedNpcId, setSelectedNpcId] = useState('');
  const [promptMode, setPromptMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState(
    stingerQueue.promptPresets[0]?.id ?? '',
  );
  const [customPrompt, setCustomPrompt] = useState('');
  const [firing, setFiring] = useState(false);
  const [fired, setFired] = useState<string | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  const selectedNpc = npcs.find((n) => n.id === selectedNpcId) ?? null;
  const promptText =
    promptMode === 'preset'
      ? (stingerQueue.promptPresets.find((p) => p.id === selectedPresetId)?.prompt ?? '')
      : customPrompt.trim();

  const canFire = !!selectedNpcId && promptText.length > 0 && !firing;

  async function handleFire() {
    if (!canFire || !selectedNpc) return;
    setFireError(null);
    setFiring(true);
    const selectedPreset =
      promptMode === 'preset'
        ? stingerQueue.promptPresets.find((p) => p.id === selectedPresetId) ?? null
        : null;
    try {
      const isCustom = promptMode === 'custom';
      const beatId = await triggerBeat({
        showId,
        npcId: selectedNpc.id,
        npcDisplayName: selectedNpc.displayName,
        promptText,
        responseTemplate: isCustom ? '{response}' : (selectedPreset?.responseTemplate ?? stingerQueue.responseTemplate),
        responseSlots: isCustom
          ? [{ id: 'response', type: 'Your answer', label: 'Your answer', freeText: true }]
          : (selectedPreset?.responseSlots ?? stingerQueue.responseSlots),
      });
      setFired(selectedNpc.displayName);
      setSelectedNpcId('');
    } catch (err) {
      setFireError('Failed to fire stinger. Check the console.');
      console.error(err);
    } finally {
      setFiring(false);
    }
  }

  return (
    <div className="npc-fire-tab">
      {fired && (
        <div className="npc-fire-tab__success" role="status">
          Stinger sent to <strong>{fired}</strong>.{' '}
          <button className="npc-fire-tab__dismiss" onClick={() => setFired(null)}>
            ×
          </button>
        </div>
      )}

      {/* NPC picker */}
      <label className="npc-fire-tab__label" htmlFor="npc-select">
        Who's getting the Stinger?
      </label>
      <select
        id="npc-select"
        className="npc-fire-tab__select"
        value={selectedNpcId}
        onChange={(e) => setSelectedNpcId(e.target.value)}
      >
        <option value="">— pick an NPC —</option>
        {npcs.map((npc) => (
          <option key={npc.id} value={npc.id}>
            {npc.displayName}
          </option>
        ))}
      </select>

      {/* Prompt */}
      <div className="npc-fire-tab__prompt-mode">
        <label className="npc-fire-tab__mode-label">
          <input
            type="radio"
            name="prompt-mode"
            value="preset"
            checked={promptMode === 'preset'}
            onChange={() => setPromptMode('preset')}
          />
          {' '}Use a preset
        </label>
        <label className="npc-fire-tab__mode-label">
          <input
            type="radio"
            name="prompt-mode"
            value="custom"
            checked={promptMode === 'custom'}
            onChange={() => setPromptMode('custom')}
          />
          {' '}Write my own
        </label>
      </div>

      {promptMode === 'preset' && (
        <div className="npc-fire-tab__presets">
          {stingerQueue.promptPresets.map((preset) => (
            <label
              key={preset.id}
              className={`npc-fire-tab__preset ${selectedPresetId === preset.id ? 'npc-fire-tab__preset--selected' : ''}`}
            >
              <input
                type="radio"
                name="preset"
                value={preset.id}
                checked={selectedPresetId === preset.id}
                onChange={() => setSelectedPresetId(preset.id)}
                className="npc-fire-tab__preset-radio"
              />
              <span className="npc-fire-tab__preset-label">{preset.label}</span>
              <span className="npc-fire-tab__preset-prompt">{preset.prompt}</span>
            </label>
          ))}
        </div>
      )}

      {promptMode === 'custom' && (
        <textarea
          className="npc-fire-tab__custom"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Type the prompt you want to send…"
          rows={3}
        />
      )}

      {/* Preview */}
      {selectedNpc && promptText && (
        <div className="npc-fire-tab__preview">
          <span className="npc-fire-tab__preview-label">Preview</span>
          <p>
            <strong>{selectedNpc.displayName}</strong> — "{promptText}"
          </p>
          <p className="npc-fire-tab__preview-template">
            Response template: <em>{stingerQueue.responseTemplate}</em>
          </p>
        </div>
      )}

      {fireError && (
        <p className="npc-fire-tab__error" role="alert">{fireError}</p>
      )}

      <button
        className="btn-primary npc-fire-tab__fire-btn"
        onClick={handleFire}
        disabled={!canFire}
      >
        {firing ? 'Firing…' : '🎯 Fire Stinger'}
      </button>
    </div>
  );
}

// ─── World tab ─────────────────────────────────────────────────────────────

function WorldTab({
  showId,
  npcs,
  worldFields,
}: {
  showId: string;
  npcs: NpcProfile[];
  worldFields: NpcFieldDef[];
}) {
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [gmPicks, setGmPicks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tally from active roster only (npcs already filtered to isActive).
  // Counts ALL votes including write-ins — not limited to predefined options.
  const tally = useMemo<WorldVoteTally>(() => {
    const result: WorldVoteTally = {};
    worldFields.forEach((field) => {
      const counts: Record<string, number> = {};
      let total = 0;
      npcs.forEach((npc) => {
        const val = npc.fieldValues?.[field.id];
        if (val) {
          counts[val] = (counts[val] ?? 0) + 1;
          total += 1;
        }
      });
      let winner: string | null = null;
      let max = 0;
      Object.entries(counts).forEach(([text, count]) => {
        if (count > max) { max = count; winner = text; }
      });
      result[field.id] = { counts, total, winnerText: winner };
    });
    return result;
  }, [npcs, worldFields]);

  useEffect(() => {
    const unsub = subscribeToWorldSelection(showId, (sel) => {
      setSelection(sel);
      if (sel) {
        setGmPicks({ setting: sel.settingValue, prize: sel.prizeValue });
      }
    });
    return unsub;
  }, [showId]);

  const displayMode = selection?.displayMode ?? 'hidden';

  const canReveal = worldFields.every((f) => {
    const fallback = f.id === 'setting' ? selection?.settingValue : selection?.prizeValue;
    return !!(gmPicks[f.id] || fallback);
  });

  async function handleSaveAndReveal(mode: WorldSelection['displayMode']) {
    setSaving(true);
    setError(null);
    try {
      await setWorldSelection(showId, {
        settingValue: gmPicks['setting'] ?? selection?.settingValue ?? '',
        prizeValue: gmPicks['prize'] ?? selection?.prizeValue ?? '',
        displayMode: mode,
      });
    } catch (err) {
      console.error('setWorldSelection failed:', err);
      setError('Could not update. Check the console.');
    } finally {
      setSaving(false);
    }
  }

  if (worldFields.length === 0) {
    return (
      <p className="npc-admin-panel__empty">
        No world fields defined in this show's system config.
      </p>
    );
  }

  const modeLabel: Record<WorldSelection['displayMode'], string> = {
    hidden: 'Hidden — not yet shown',
    'world-reveal': 'World Reveal — flip cards on screen',
    cast: 'Cast Scene — NPC cards + world sidebar',
  };

  return (
    <div className="npc-world-tab">
      {/* Live values — visible when something is on screen so GM knows what the audience sees */}
      {displayMode !== 'hidden' && selection && (
        <div className="npc-world-tab__live-bar">
          <span className="npc-world-tab__live-label">On screen now:</span>
          {worldFields.map((f) => {
            const val = f.id === 'setting' ? selection.settingValue : selection.prizeValue;
            return val ? (
              <span key={f.id} className="npc-world-tab__live-chip">{val}</span>
            ) : null;
          })}
          <span className="npc-world-tab__live-mode">({modeLabel[displayMode]})</span>
        </div>
      )}

      <div className="npc-world-tab__fields">
        {worldFields.map((field) => {
          const fieldTally = tally[field.id];
          const currentPick = gmPicks[field.id] ?? '';
          const storedValue = field.id === 'setting'
            ? selection?.settingValue
            : selection?.prizeValue;

          return (
            <div key={field.id} className="npc-world-field">
              <h3 className="npc-world-field__heading">
                <span className="npc-world-field__type">{field.type}</span>
                <span className="npc-world-field__label">{field.label}</span>
                {fieldTally && (
                  <span className="npc-world-field__total">
                    {fieldTally.total} vote{fieldTally.total !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>

              {(() => {
                // Build the full option list visible to the GM:
                //   1. Predefined options from system config
                //   2. Write-ins that active roster members voted for
                //   3. The stored live value if it doesn't appear in 1 or 2 (orphan)
                const presetOpts = field.options ?? [];
                const writeInOpts = Object.keys(fieldTally?.counts ?? {}).filter(
                  (o) => !presetOpts.includes(o),
                );
                const orphan =
                  storedValue &&
                  !presetOpts.includes(storedValue) &&
                  !writeInOpts.includes(storedValue)
                    ? storedValue
                    : null;
                type Kind = 'preset' | 'write-in' | 'orphan';
                const allOpts: { text: string; kind: Kind }[] = [
                  ...presetOpts.map((o) => ({ text: o, kind: 'preset' as Kind })),
                  ...writeInOpts.map((o) => ({ text: o, kind: 'write-in' as Kind })),
                  ...(orphan ? [{ text: orphan, kind: 'orphan' as Kind }] : []),
                ];

                return (
                  <div className="npc-world-field__options">
                    {allOpts.map(({ text: opt, kind }) => {
                      const count = fieldTally?.counts[opt] ?? 0;
                      const total = fieldTally?.total ?? 0;
                      const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                      const isVoteWinner = fieldTally?.winnerText === opt && total > 0;
                      const isSelected = currentPick === opt;

                      return (
                        <label
                          key={opt}
                          className={[
                            'npc-world-option',
                            isSelected ? 'npc-world-option--selected' : '',
                            isVoteWinner ? 'npc-world-option--winner' : '',
                            kind !== 'preset' ? 'npc-world-option--write-in' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <input
                            type="radio"
                            name={`world-pick-${field.id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => setGmPicks((prev) => ({ ...prev, [field.id]: opt }))}
                            className="npc-world-option__radio"
                          />
                          <span className="npc-world-option__bar-wrap">
                            <span
                              className="npc-world-option__bar"
                              style={{ width: count > 0 ? `${pct}%` : '0%' }}
                              aria-hidden
                            />
                          </span>
                          <span className="npc-world-option__text">{opt}</span>
                          <span className="npc-world-option__count">
                            {count > 0 && <>{count} · {pct}%</>}
                            {isVoteWinner && <span className="npc-world-option__winner-badge">audience pick</span>}
                            {kind === 'write-in' && <span className="npc-world-option__write-in-badge">write-in</span>}
                            {kind === 'orphan' && <span className="npc-world-option__write-in-badge">live · no active votes</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}

              {storedValue && currentPick !== storedValue && (
                <p className="npc-world-field__pending">
                  Unsaved — currently live: <strong>{storedValue}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="npc-world-tab__error" role="alert">{error}</p>}

      {/* Persistent mode control — always visible, jump to any state directly */}
      <div className="npc-world-tab__display-control">
        <p className="npc-world-tab__display-label">Show on projector:</p>
        <div className="npc-world-tab__mode-seg">
          <button
            className={`npc-world-tab__mode-btn${displayMode === 'hidden' ? ' npc-world-tab__mode-btn--active' : ''}`}
            onClick={() => handleSaveAndReveal('hidden')}
            disabled={saving}
          >
            Hide
          </button>
          <button
            className={`npc-world-tab__mode-btn${displayMode === 'world-reveal' ? ' npc-world-tab__mode-btn--active' : ''}`}
            onClick={() => handleSaveAndReveal('world-reveal')}
            disabled={saving || !canReveal}
            title={!canReveal ? 'Pick a value for each field first' : 'Show flip-card reveal on the projector'}
          >
            World Reveal
          </button>
          <button
            className={`npc-world-tab__mode-btn${displayMode === 'cast' ? ' npc-world-tab__mode-btn--active' : ''}`}
            onClick={() => handleSaveAndReveal('cast')}
            disabled={saving || !canReveal}
            title={!canReveal ? 'Pick a value for each field first' : 'Show NPC cards + world sidebar on the projector'}
          >
            Show Cast
          </button>
        </div>
        {saving && <p className="npc-world-tab__mode-hint">Saving…</p>}
        {!canReveal && !saving && (
          <p className="npc-world-tab__mode-hint">Pick a value for each field to enable World Reveal and Show Cast.</p>
        )}
      </div>
    </div>
  );
}

// ─── Mod Queue tab ─────────────────────────────────────────────────────────

function ModTab({ beats, approvedBeats }: { beats: Beat[]; approvedBeats: Beat[] }) {
  const [moderating, setModerating] = useState<string | null>(null);
  const [clearing, setClearing] = useState<string | null>(null);

  async function handleModerate(beatId: string, decision: 'approved' | 'rejected') {
    setModerating(beatId);
    try {
      await moderateBeat(beatId, decision);
    } catch (err) {
      console.error('moderateBeat failed:', err);
    } finally {
      setModerating(null);
    }
  }

  async function handleClear(beatId: string) {
    setClearing(beatId);
    try {
      await clearBeat(beatId);
    } catch (err) {
      console.error('clearBeat failed:', err);
    } finally {
      setClearing(null);
    }
  }

  return (
    <div className="npc-mod-tab">
      {beats.length === 0 && approvedBeats.length === 0 && (
        <p className="npc-admin-panel__empty">
          No responses waiting. Fire a Stinger and wait for the audience to respond.
        </p>
      )}

      {beats.length > 0 && (
        <>
          <h3 className="npc-mod-tab__section-heading">Awaiting review</h3>
          <ol className="npc-mod-queue">
            {beats.map((beat) => (
              <li key={beat.id} className="npc-mod-queue__item">
                <div className="npc-mod-queue__meta">
                  <span className="npc-mod-queue__name">{beat.npcDisplayName}</span>
                  <span className="npc-mod-queue__prompt">"{beat.promptText}"</span>
                </div>

                {beat.response ? (
                  <>
                    <p className="npc-mod-queue__response">
                      {beat.response.assembledText}
                    </p>
                    <div className="npc-mod-queue__actions">
                      <button
                        className="btn-primary npc-mod-queue__approve"
                        onClick={() => handleModerate(beat.id, 'approved')}
                        disabled={moderating === beat.id}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn-ghost npc-mod-queue__reject"
                        onClick={() => handleModerate(beat.id, 'rejected')}
                        disabled={moderating === beat.id}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="npc-mod-queue__waiting">Waiting for response…</p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {approvedBeats.length > 0 && (
        <>
          <h3 className="npc-mod-tab__section-heading">Live feed</h3>
          <ol className="npc-mod-queue npc-mod-queue--approved">
            {approvedBeats.map((beat) => (
              <li key={beat.id} className="npc-mod-queue__item">
                <div className="npc-mod-queue__meta">
                  <span className="npc-mod-queue__name">{beat.npcDisplayName}</span>
                </div>
                {beat.response && (
                  <p className="npc-mod-queue__response">{beat.response.assembledText}</p>
                )}
                <div className="npc-mod-queue__actions">
                  <button
                    className="btn-ghost npc-mod-queue__clear"
                    onClick={() => handleClear(beat.id)}
                    disabled={clearing === beat.id}
                  >
                    {clearing === beat.id ? '…' : 'Clear from feed'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
