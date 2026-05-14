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

import { useEffect, useState, type ReactNode } from 'react';
import { getAuth } from 'firebase/auth';
import {
  subscribeToNpcs,
  subscribeToBeatsForShow,
  triggerBeat,
  moderateBeat,
  clearBeat,
  archiveNpc,
  type NpcProfile,
  type Beat,
  type BeatResponseSlot,
} from '../../../../src/lib/npcs/npcApi';

const FUNCTIONS_BASE = 'https://us-central1-misadventuring-live.cloudfunctions.net';

// ─── Config types ──────────────────────────────────────────────────────────

interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
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

type Tab = 'roster' | 'fire' | 'mod';

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
        {(['roster', 'fire', 'mod'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`npc-admin-tab ${tab === t ? 'npc-admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'roster' && `Roster (${npcs.length})`}
            {t === 'fire' && 'Fire Stinger'}
            {t === 'mod' && `Mod Queue${modQueueCount > 0 ? ` (${modQueueCount})` : ''}`}
          </button>
        ))}
      </div>

      <div className="npc-admin-panel__body">
        {tab === 'roster' && (
          <RosterTab
            npcs={npcs}
            fields={showConfig.npcCreation?.fields ?? []}
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
  onSelectForStinger,
}: {
  npcs: NpcProfile[];
  fields: NpcFieldDef[];
  onSelectForStinger: (npc: NpcProfile) => void;
}) {
  const [archiving, setArchiving] = useState<string | null>(null);

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

  return (
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
      const beatId = await triggerBeat({
        showId,
        npcId: selectedNpc.id,
        npcDisplayName: selectedNpc.displayName,
        promptText,
        responseTemplate: stingerQueue.responseTemplate,
        responseSlots: selectedPreset?.responseSlots ?? stingerQueue.responseSlots,
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
