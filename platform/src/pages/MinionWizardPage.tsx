/**
 * MinionWizardPage — /keeper/minions/new  &  /keeper/minions/:id/edit
 *
 * 5-step wizard for creating or editing a Keeper minion stat block.
 * Admin-gated.
 *
 * Steps:
 *   0. Name & Description
 *   1. Type & Motivation     — seeds attack/harm on select
 *   2. Attack                — name, harm (1–4 typical), tags, optional armour
 *   3. Harm Capacity         — 5–10 typical
 *   4. Moves & Save          — standard minion moves + custom moves
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import {
  createKeeperThreat,
  getKeeperThreat,
  updateKeeperThreat,
  type ThreatAttack,
  type ThreatCustomMove,
} from '../../../src/lib/threats/threatApi';

// ─── System data ──────────────────────────────────────────────────────────────

const MINION_TYPES = [
  { id: 'assassin',   motivation: 'to kill the hunters' },
  { id: 'brute',      motivation: 'to intimidate and attack' },
  { id: 'cultist',    motivation: 'to save their own skin at any cost' },
  { id: 'guardian',   motivation: 'to bar a way or protect something' },
  { id: 'right-hand', motivation: 'to back up the monster' },
  { id: 'plague',     motivation: 'to swarm and destroy' },
  { id: 'renfield',   motivation: 'to push victims towards the monster' },
  { id: 'scout',      motivation: 'to stalk, watch, and report' },
  { id: 'thief',      motivation: 'to steal and deliver to the monster' },
  { id: 'traitor',    motivation: 'to betray people' },
];

const STANDARD_MOVES = [
  'A burst of sudden, uncontrolled violence',
  'Make a coordinated attack',
  'Capture someone, or steal something',
  'Reveal a secret',
  'Deliver someone or something to the master',
  'Give chase',
  'Make a threat or demand on behalf of the master',
  'Run away',
  'Use an unnatural power',
  'Display a hint of conscience or humanity',
  'Disobey the master, in some petty way',
];

const ATTACK_TAGS = ['hand', 'close', 'far', 'intimate', 'area', 'messy', 'loud', 'obvious', 'magic', 'ignore-armour', 'touch', 'forceful'];

const DERIVATION: Record<string, { harmCapacity: number; attackHarm: number; attackName: string; armour: number }> = {
  assassin:    { harmCapacity: 8,  attackHarm: 4, attackName: 'Lethal strike',     armour: 0 },
  brute:       { harmCapacity: 9,  attackHarm: 3, attackName: 'Brutal assault',     armour: 1 },
  cultist:     { harmCapacity: 6,  attackHarm: 2, attackName: 'Fanatical attack',   armour: 0 },
  guardian:    { harmCapacity: 10, attackHarm: 3, attackName: 'Defensive strike',   armour: 1 },
  'right-hand':{ harmCapacity: 8,  attackHarm: 3, attackName: 'Commander strike',   armour: 1 },
  plague:      { harmCapacity: 7,  attackHarm: 2, attackName: 'Swarm attack',       armour: 0 },
  renfield:    { harmCapacity: 5,  attackHarm: 1, attackName: 'Desperate strike',   armour: 0 },
  scout:       { harmCapacity: 6,  attackHarm: 2, attackName: 'Ambush strike',      armour: 0 },
  thief:       { harmCapacity: 6,  attackHarm: 2, attackName: 'Quick jab',          armour: 0 },
  traitor:     { harmCapacity: 5,  attackHarm: 2, attackName: 'Betrayal blow',      armour: 0 },
};

const STEPS = ['Name & Description', 'Type & Motivation', 'Attack', 'Harm Capacity', 'Moves & Save'];

// ─── State ────────────────────────────────────────────────────────────────────

interface WizardState {
  name: string;
  description: string;
  typeId: string;
  motivation: string;
  attack: ThreatAttack;
  armour: number;
  harmCapacity: number;
  standardMoves: string[];
  customMoves: ThreatCustomMove[];
}

const EMPTY: WizardState = {
  name: '', description: '', typeId: '', motivation: '',
  attack: { name: '', harm: 2, tags: [] }, armour: 0, harmCapacity: 7,
  standardMoves: [], customMoves: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MinionWizardPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(EMPTY);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [derived, setDerived] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    getKeeperThreat(id).then((t) => {
      if (!t || t.category !== 'minion') { navigate('/keeper'); return; }
      setState({
        name: t.name, description: t.description, typeId: t.typeId, motivation: t.motivation,
        attack: t.attack ?? { name: '', harm: 2, tags: [] }, armour: t.armour ?? 0,
        harmCapacity: t.harmCapacity ?? 7, standardMoves: t.standardMoves ?? [], customMoves: t.customMoves ?? [],
      });
      setLoadingExisting(false);
    });
  }, [id, isEdit, navigate]);

  if (authLoading || loadingExisting) return <div className="page-card"><p className="typewriter-label">Loading…</p></div>;
  if (!isAdmin) return <div className="page-card"><p className="typewriter-label">Keeper access only.</p></div>;

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function applyDerivation(typeId: string) {
    const profile = DERIVATION[typeId];
    const motivation = MINION_TYPES.find((t) => t.id === typeId)?.motivation ?? '';
    if (profile) {
      setState((prev) => ({
        ...prev, typeId, motivation,
        attack: { name: profile.attackName, harm: profile.attackHarm, tags: ['close'] },
        armour: profile.armour, harmCapacity: profile.harmCapacity,
      }));
      setDerived(true);
    } else {
      setState((prev) => ({ ...prev, typeId, motivation }));
    }
  }

  function canAdvance() {
    if (step === 0) return state.name.trim().length > 0 && state.description.trim().length > 0;
    if (step === 1) return state.typeId.length > 0;
    return true;
  }

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const payload = {
        category: 'minion' as const,
        name: state.name.trim(), description: state.description.trim(),
        typeId: state.typeId, motivation: state.motivation,
        attack: state.attack, armour: state.armour, harmCapacity: state.harmCapacity,
        standardMoves: state.standardMoves, customMoves: state.customMoves,
      };
      if (isEdit && id) {
        await updateKeeperThreat(id, payload);
        navigate(`/keeper/minions/${id}`);
      } else {
        const created = await createKeeperThreat(payload);
        navigate(`/keeper/minions/${created.id}`);
      }
    } catch (err) {
      console.error(err);
      setError('Save failed. Try again.');
      setSaving(false);
    }
  }

  return (
    <section className="page-card monster-wizard">
      <header className="wizard-header">
        <Link to="/keeper" className="wizard-back-link typewriter-label">← Compendium</Link>
        <h1 className="wizard-title">{isEdit ? 'Edit Minion' : 'New Minion'}</h1>
      </header>

      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step-dot${i === step ? ' wizard-step-dot--active' : ''}${i < step ? ' wizard-step-dot--done' : ''}`} title={label} />
        ))}
      </div>
      <p className="wizard-step-label typewriter-label">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

      <div className="wizard-body">
        {step === 0 && <NameDescStep state={state} set={set} />}
        {step === 1 && <TypeStep state={state} applyDerivation={applyDerivation} types={MINION_TYPES} hint="Selecting a type pre-fills attack and harm capacity." />}
        {step === 2 && <MinionAttackStep state={state} set={set} derived={derived} onEdit={() => setDerived(false)} tags={ATTACK_TAGS} />}
        {step === 3 && <MinionHarmStep state={state} set={set} derived={derived} onEdit={() => setDerived(false)} />}
        {step === 4 && <MovesAndSaveStep state={state} set={set} moves={STANDARD_MOVES} onSave={handleSave} saving={saving} error={error} isEdit={isEdit} />}
      </div>

      {step < STEPS.length - 1 && (
        <div className="wizard-nav">
          {step > 0 && <button className="btn-secondary" onClick={() => setStep((s) => s - 1)}>Back</button>}
          <button className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>Next</button>
        </div>
      )}
    </section>
  );
}

// ─── Shared step: Name & Description ─────────────────────────────────────────

function NameDescStep({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Name & Description</h2>
      <p className="wizard-step-hint typewriter-label">Describe what it looks like and how it behaves — useful for your MidJourney brief later.</p>
      <label className="wizard-label" htmlFor="name">Name</label>
      <input id="name" className="wizard-input" type="text" value={state.name} onChange={(e) => set('name', e.target.value)} placeholder="The Pale Watcher, Sister Morrow…" maxLength={80} autoFocus />
      <label className="wizard-label" htmlFor="desc">Description</label>
      <textarea id="desc" className="wizard-textarea" value={state.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe its appearance, movement, and the role it plays…" rows={5} maxLength={800} />
    </div>
  );
}

// ─── Shared step: Type & Motivation ──────────────────────────────────────────

function TypeStep({ state, applyDerivation, types, hint }: {
  state: WizardState;
  applyDerivation: (id: string) => void;
  types: { id: string; motivation: string }[];
  hint: string;
}) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Type & Motivation</h2>
      <p className="wizard-step-hint typewriter-label">{hint}</p>
      <div className="type-grid">
        {types.map((t) => (
          <button key={t.id} className={`type-card${state.typeId === t.id ? ' type-card--selected' : ''}`} onClick={() => applyDerivation(t.id)}>
            <span className="type-card-id">{t.id}</span>
            <span className="type-card-motivation">{t.motivation}</span>
          </button>
        ))}
      </div>
      {state.typeId && (
        <div className="type-selected-summary">
          <span className="type-selected-badge typewriter-label">{state.typeId}</span>
          <span className="type-selected-motivation">{state.motivation}</span>
        </div>
      )}
    </div>
  );
}

// ─── Minion: Attack step ──────────────────────────────────────────────────────

function MinionAttackStep({ state, set, derived, onEdit, tags }: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  derived: boolean;
  onEdit: () => void;
  tags: string[];
}) {
  function updateAttack(partial: Partial<ThreatAttack>) {
    set('attack', { ...state.attack, ...partial });
    onEdit();
  }
  function toggleTag(tag: string) {
    const tags = state.attack.tags.includes(tag) ? state.attack.tags.filter((t) => t !== tag) : [...state.attack.tags, tag];
    updateAttack({ tags });
  }
  const harm = state.attack.harm;
  const harmWarning = harm > 4 ? 'Above 4 is high for a minion — consider if this is a right-hand or boss-tier.' : null;

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Attack</h2>
      {derived && <p className="wizard-derived-notice typewriter-label">Pre-filled from type — edit freely.</p>}
      <p className="wizard-step-hint typewriter-label">Minion attacks are typically 1–4 harm.</p>
      <label className="wizard-label" htmlFor="attack-name">Attack name</label>
      <input id="attack-name" className="wizard-input" type="text" value={state.attack.name} onChange={(e) => updateAttack({ name: e.target.value })} placeholder="Brutal assault, Quick jab…" maxLength={80} />
      <label className="wizard-label">Harm <span className="wizard-label-hint typewriter-label">(1–4 typical)</span></label>
      <div className="stepper-row">
        <button className="stepper-btn" onClick={() => updateAttack({ harm: Math.max(1, harm - 1) })}>−</button>
        <span className="stepper-value">{harm}</span>
        <button className="stepper-btn" onClick={() => updateAttack({ harm: Math.min(8, harm + 1) })}>+</button>
      </div>
      {harmWarning && <p className="wizard-warning typewriter-label">{harmWarning}</p>}
      <label className="wizard-label">Tags</label>
      <div className="tag-grid">
        {tags.map((tag) => (
          <button key={tag} className={`tag-pill${state.attack.tags.includes(tag) ? ' tag-pill--active' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
        ))}
      </div>
      <label className="wizard-label">Armour <span className="wizard-label-hint typewriter-label">(rare for minions)</span></label>
      <div className="stepper-row">
        <button className="stepper-btn" onClick={() => { set('armour', Math.max(0, (state.armour ?? 0) - 1)); onEdit(); }}>−</button>
        <span className="stepper-value">{state.armour ?? 0}</span>
        <button className="stepper-btn" onClick={() => { set('armour', Math.min(3, (state.armour ?? 0) + 1)); onEdit(); }}>+</button>
      </div>
    </div>
  );
}

// ─── Minion: Harm Capacity step ───────────────────────────────────────────────

function MinionHarmStep({ state, set, derived, onEdit }: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  derived: boolean;
  onEdit: () => void;
}) {
  const hc = state.harmCapacity ?? 7;
  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Harm Capacity</h2>
      {derived && <p className="wizard-derived-notice typewriter-label">Pre-filled from type — edit freely.</p>}
      <p className="wizard-step-hint typewriter-label">Typically 5–10. Weaker than a monster, but still threatening.</p>
      <div className="stepper-row stepper-row--large">
        <button className="stepper-btn" onClick={() => { set('harmCapacity', Math.max(1, hc - 1)); onEdit(); }}>−</button>
        <span className="stepper-value stepper-value--large">{hc}</span>
        <button className="stepper-btn" onClick={() => { set('harmCapacity', Math.min(15, hc + 1)); onEdit(); }}>+</button>
      </div>
    </div>
  );
}

// ─── Shared step: Moves & Save ────────────────────────────────────────────────

function MovesAndSaveStep({ state, set, moves, onSave, saving, error, isEdit }: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  moves: string[];
  onSave: () => void;
  saving: boolean;
  error: string | null;
  isEdit: boolean;
}) {
  const [newTrigger, setNewTrigger] = useState('');
  const [newEffect, setNewEffect] = useState('');

  function toggleMove(move: string) {
    const next = state.standardMoves.includes(move) ? state.standardMoves.filter((m) => m !== move) : [...state.standardMoves, move];
    set('standardMoves', next);
  }
  function addCustomMove() {
    const trigger = newTrigger.trim(); const effect = newEffect.trim();
    if (!trigger || !effect) return;
    set('customMoves', [...state.customMoves, { trigger, effect }]);
    setNewTrigger(''); setNewEffect('');
  }
  function removeCustomMove(i: number) { set('customMoves', state.customMoves.filter((_, idx) => idx !== i)); }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Moves</h2>
      <h3 className="wizard-subheading">Standard moves</h3>
      <ul className="move-checklist">
        {moves.map((move) => (
          <li key={move} className="move-check-item">
            <label className="move-check-label">
              <input type="checkbox" className="move-check-input" checked={state.standardMoves.includes(move)} onChange={() => toggleMove(move)} />
              <span>{move}</span>
            </label>
          </li>
        ))}
      </ul>
      <h3 className="wizard-subheading">Custom moves</h3>
      {state.customMoves.map((m, i) => (
        <div key={i} className="custom-move-item">
          <div className="custom-move-trigger typewriter-label">When {m.trigger}</div>
          <div className="custom-move-effect">{m.effect}</div>
          <button className="btn-ghost custom-move-remove" onClick={() => removeCustomMove(i)}>×</button>
        </div>
      ))}
      <div className="custom-move-add">
        <label className="wizard-label" htmlFor="trigger">Trigger</label>
        <input id="trigger" className="wizard-input" type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} placeholder="When the cultist dies…" maxLength={200} />
        <label className="wizard-label" htmlFor="effect">Effect</label>
        <input id="effect" className="wizard-input" type="text" value={newEffect} onChange={(e) => setNewEffect(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomMove()} placeholder="The monster immediately knows and arrives…" maxLength={300} />
        <button className="btn-secondary" onClick={addCustomMove} disabled={!newTrigger.trim() || !newEffect.trim()}>Add move</button>
      </div>
      {error && <p className="wizard-error">{error}</p>}
      <div className="wizard-nav">
        <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : `Create ${state.name || 'threat'}`}</button>
      </div>
    </div>
  );
}
