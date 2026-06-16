/**
 * MonsterWizardPage — /keeper/monsters/new  &  /keeper/monsters/:id/edit
 *
 * 8-step wizard for creating or editing a Keeper monster stat block.
 * All data sourced from monster-of-the-week-full.system.json (threats.monster).
 * Admin-gated.
 *
 * Steps:
 *   0. Name & Description    — who/what is this; doubles as MidJourney brief
 *   1. Type & Motivation     — the keystone; seeds steps 2–5 on select
 *   2. Powers                — seeded from type, editable
 *   3. Attack                — name, harm, tags
 *   4. Armour                — 0–4 stepper (warn above 2)
 *   5. Harm Capacity         — stepper (min 7, warn above 12)
 *   6. Weaknesses            — required; at least one
 *   7. Moves & Review        — standard moves + custom moves + save
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import {
  createKeeperThreat,
  getKeeperThreat,
  updateKeeperThreat,
  type KeeperThreat,
  type ThreatAttack,
  type ThreatWeakness,
  type ThreatCustomMove,
} from '../../../src/lib/threats/threatApi';

// ─── System data (source of truth) ───────────────────────────────────────────

const MONSTER_TYPES: { id: string; motivation: string }[] = [
  { id: 'beast',       motivation: 'to run wild, destroying and killing' },
  { id: 'breeder',     motivation: 'to give birth to, bring forth, or create evil' },
  { id: 'collector',   motivation: 'to steal specific sorts of things' },
  { id: 'destroyer',   motivation: 'to bring about the end of the world' },
  { id: 'devourer',    motivation: 'to consume people' },
  { id: 'executioner', motivation: 'to punish the guilty' },
  { id: 'parasite',    motivation: 'to infest, control and devour' },
  { id: 'queen',       motivation: 'to possess and control' },
  { id: 'sorcerer',    motivation: 'to usurp unnatural power' },
  { id: 'tempter',     motivation: 'to tempt people into evil deeds' },
  { id: 'torturer',    motivation: 'to hurt and terrify' },
  { id: 'trickster',   motivation: 'to create chaos' },
];

const STANDARD_MOVES: string[] = [
  'Hint at its presence',
  'Display its full might',
  'Appear suddenly',
  'Attack with great force and fury',
  'Seize someone or something',
  'Attack with stealth and calculation',
  'Order underlings to do terrible acts',
  'Destroy something',
  'Escape, no matter how well contained it is',
  'Give chase',
  'Return to home ground',
  'Boast and gloat, maybe revealing a secret',
  'Return from seeming destruction',
  'Use an unnatural power',
];

const WEAKNESS_PRESETS: Record<ThreatWeakness['category'], string[]> = {
  direct:      ['Silver', 'Cold iron', 'Holy water', 'Salt', 'Fire', 'Its own reflection'],
  environment: ['Sunlight', 'Running water', 'Hallowed ground', 'Below freezing temperatures', 'Near the sea'],
  ritual:      ['A specific incantation', 'Burning its true name', 'Destroying a tethered object', 'An exorcism', 'A sacrifice at the right place'],
};

const ATTACK_TAGS: string[] = [
  'hand', 'close', 'far', 'intimate', 'area',
  'messy', 'loud', 'obvious', 'slow', 'reload',
  'magic', 'ignore-armour', 'touch', 'forceful', 'restraining',
];

const KILL_NOTE = 'A monster only truly dies once its weakness is used against it, no matter how much harm it has taken.';

// ─── Derivation table ─────────────────────────────────────────────────────────
// Seeded defaults when type is selected. All values are overridable by the GM.

interface TypeProfile {
  harmCapacity: number;
  attackHarm: number;
  attackName: string;
  armour: number;
  powers: string[];
}

const DERIVATION: Record<string, TypeProfile> = {
  beast:       { harmCapacity: 12, attackHarm: 4, attackName: 'Savage mauling',     armour: 1, powers: ['Savage strength', 'Enhanced senses', 'Predatory speed'] },
  breeder:     { harmCapacity: 10, attackHarm: 3, attackName: 'Frenzied strike',     armour: 0, powers: ['Spawn minions', 'Hive mind link', 'Rapid reproduction'] },
  collector:   { harmCapacity: 9,  attackHarm: 3, attackName: 'Precise strike',      armour: 2, powers: ['Telekinesis', 'Phase through walls', 'Memory wipe'] },
  destroyer:   { harmCapacity: 12, attackHarm: 5, attackName: 'Devastating blow',    armour: 2, powers: ['Massive physical power', 'Damage immunity', 'Reality corruption'] },
  devourer:    { harmCapacity: 11, attackHarm: 4, attackName: 'Devouring bite',      armour: 1, powers: ['Acidic digestion', 'Swallow whole', 'Regeneration from eating'] },
  executioner: { harmCapacity: 10, attackHarm: 4, attackName: 'Death strike',        armour: 1, powers: ['True sight', 'Impossible tracking', 'Unstoppable pursuit'] },
  parasite:    { harmCapacity: 9,  attackHarm: 3, attackName: 'Parasitic latch',     armour: 0, powers: ['Mind control', 'Body hijack', 'Psychic intrusion'] },
  queen:       { harmCapacity: 9,  attackHarm: 3, attackName: 'Commanding strike',   armour: 1, powers: ['Domination aura', 'Minion network', 'Telepathic command'] },
  sorcerer:    { harmCapacity: 9,  attackHarm: 3, attackName: 'Arcane blast',        armour: 1, powers: ['Spellcasting', 'Reality manipulation', 'Ward breaking'] },
  tempter:     { harmCapacity: 8,  attackHarm: 3, attackName: 'Corrupting touch',    armour: 1, powers: ['Perfect disguise', 'Emotional manipulation', 'Addictive presence'] },
  torturer:    { harmCapacity: 10, attackHarm: 3, attackName: 'Inflicting agony',    armour: 1, powers: ['Pain amplification', 'Fear projection', 'Psychic agony'] },
  trickster:   { harmCapacity: 8,  attackHarm: 3, attackName: 'Surprise attack',     armour: 1, powers: ['Shapeshifting', 'Illusion weaving', 'Reality glitch'] },
};

// ─── State types ──────────────────────────────────────────────────────────────

interface WizardState {
  name: string;
  description: string;
  typeId: string;
  motivation: string;
  powers: string[];
  attack: ThreatAttack;
  armour: number;
  harmCapacity: number;
  weaknesses: ThreatWeakness[];
  standardMoves: string[];
  customMoves: ThreatCustomMove[];
}

const EMPTY_STATE: WizardState = {
  name: '',
  description: '',
  typeId: '',
  motivation: '',
  powers: [],
  attack: { name: '', harm: 3, tags: [] },
  armour: 0,
  harmCapacity: 10,
  weaknesses: [],
  standardMoves: [],
  customMoves: [],
};

const STEPS = [
  'Name & Description',
  'Type & Motivation',
  'Powers',
  'Attack',
  'Armour',
  'Harm Capacity',
  'Weaknesses',
  'Moves & Save',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MonsterWizardPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [derivedFields, setDerivedFields] = useState<Set<string>>(new Set());

  // New power input ref
  const powerInputRef = useRef<HTMLInputElement>(null);
  const customMoveTriggerRef = useRef<HTMLInputElement>(null);

  // Load existing threat for edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    getKeeperThreat(id).then((threat) => {
      if (!threat || threat.category !== 'monster') {
        navigate('/keeper');
        return;
      }
      setState({
        name: threat.name,
        description: threat.description,
        typeId: threat.typeId,
        motivation: threat.motivation,
        powers: threat.powers ?? [],
        attack: threat.attack ?? { name: '', harm: 3, tags: [] },
        armour: threat.armour ?? 0,
        harmCapacity: threat.harmCapacity ?? 10,
        weaknesses: threat.weaknesses ?? [],
        standardMoves: threat.standardMoves ?? [],
        customMoves: threat.customMoves ?? [],
      });
      setLoadingExisting(false);
    });
  }, [id, isEdit, navigate]);

  if (authLoading || loadingExisting) {
    return <div className="page-card"><p className="typewriter-label">Loading…</p></div>;
  }
  if (!isAdmin) {
    return (
      <section className="page-card">
        <p className="typewriter-label">Keeper access only.</p>
        <Link to="/" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to home</Link>
      </section>
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function applyDerivation(typeId: string) {
    const profile = DERIVATION[typeId];
    if (!profile) return;
    setState((prev) => ({
      ...prev,
      typeId,
      motivation: MONSTER_TYPES.find((t) => t.id === typeId)?.motivation ?? '',
      powers: [...profile.powers],
      attack: { name: profile.attackName, harm: profile.attackHarm, tags: ['close'] },
      armour: profile.armour,
      harmCapacity: profile.harmCapacity,
    }));
    setDerivedFields(new Set(['powers', 'attack', 'armour', 'harmCapacity']));
  }

  function clearDerived(field: string) {
    setDerivedFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    switch (step) {
      case 0: return state.name.trim().length > 0 && state.description.trim().length > 0;
      case 1: return state.typeId.length > 0;
      case 6: return state.weaknesses.length > 0;
      default: return true;
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (state.weaknesses.length === 0) {
      setError('At least one weakness is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        category: 'monster' as const,
        name: state.name.trim(),
        description: state.description.trim(),
        typeId: state.typeId,
        motivation: state.motivation,
        powers: state.powers,
        attack: state.attack,
        armour: state.armour,
        harmCapacity: state.harmCapacity,
        weaknesses: state.weaknesses,
        standardMoves: state.standardMoves,
        customMoves: state.customMoves,
      };
      if (isEdit && id) {
        await updateKeeperThreat(id, payload);
        navigate(`/keeper/monsters/${id}`);
      } else {
        const created = await createKeeperThreat(payload);
        navigate(`/keeper/monsters/${created.id}`);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setError('Save failed. Try again.');
      setSaving(false);
    }
  }

  // ─── Step renders ──────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0: return <StepDescription state={state} set={set} />;
      case 1: return <StepType state={state} applyDerivation={applyDerivation} />;
      case 2: return <StepPowers state={state} set={set} derived={derivedFields.has('powers')} clearDerived={() => clearDerived('powers')} powerInputRef={powerInputRef} />;
      case 3: return <StepAttack state={state} set={set} derived={derivedFields.has('attack')} clearDerived={() => clearDerived('attack')} />;
      case 4: return <StepArmour state={state} set={set} derived={derivedFields.has('armour')} clearDerived={() => clearDerived('armour')} />;
      case 5: return <StepHarmCapacity state={state} set={set} derived={derivedFields.has('harmCapacity')} clearDerived={() => clearDerived('harmCapacity')} />;
      case 6: return <StepWeaknesses state={state} set={set} />;
      case 7: return <StepMoves state={state} set={set} onSave={handleSave} saving={saving} error={error} isEdit={isEdit} customMoveTriggerRef={customMoveTriggerRef} />;
      default: return null;
    }
  }

  return (
    <section className="page-card monster-wizard">
      {/* Header */}
      <header className="wizard-header">
        <Link to="/keeper" className="wizard-back-link typewriter-label">← Compendium</Link>
        <h1 className="wizard-title">{isEdit ? 'Edit Monster' : 'New Monster'}</h1>
      </header>

      {/* Step indicator */}
      <div className="wizard-steps" aria-label="Wizard progress">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`wizard-step-dot${i === step ? ' wizard-step-dot--active' : ''}${i < step ? ' wizard-step-dot--done' : ''}`}
            title={label}
          />
        ))}
      </div>
      <p className="wizard-step-label typewriter-label">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>

      {/* Step content */}
      <div className="wizard-body">{renderStep()}</div>

      {/* Navigation */}
      {step < STEPS.length - 1 && (
        <div className="wizard-nav">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Step 0: Name & Description ───────────────────────────────────────────────

function StepDescription({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Name & Description</h2>
      <p className="wizard-step-hint typewriter-label">
        Write the description as a visual brief — what does it look like? How does it move? What makes it wrong?
      </p>

      <label className="wizard-label" htmlFor="monster-name">Name</label>
      <input
        id="monster-name"
        className="wizard-input"
        type="text"
        value={state.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="The Hollow King, Gristle, The Pale Weaver…"
        maxLength={80}
        autoFocus
      />

      <label className="wizard-label" htmlFor="monster-description">Description</label>
      <textarea
        id="monster-description"
        className="wizard-textarea"
        value={state.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="Describe its appearance, movement, and the wrongness of it. This becomes your MidJourney brief."
        rows={6}
        maxLength={1000}
      />
      <p className="wizard-char-count typewriter-label">{state.description.length}/1000</p>
    </div>
  );
}

// ─── Step 1: Type & Motivation ────────────────────────────────────────────────

function StepType({ state, applyDerivation }: { state: WizardState; applyDerivation: (typeId: string) => void }) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Type & Motivation</h2>
      <p className="wizard-step-hint typewriter-label">
        Picking a type locks the motivation and pre-fills combat stats. You can override everything on the following steps.
      </p>

      <div className="type-grid">
        {MONSTER_TYPES.map((t) => (
          <button
            key={t.id}
            className={`type-card${state.typeId === t.id ? ' type-card--selected' : ''}`}
            onClick={() => applyDerivation(t.id)}
          >
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

// ─── Step 2: Powers ───────────────────────────────────────────────────────────

function StepPowers({
  state, set, derived, clearDerived, powerInputRef,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  derived: boolean;
  clearDerived: () => void;
  powerInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [newPower, setNewPower] = useState('');

  function addPower() {
    const trimmed = newPower.trim();
    if (!trimmed || state.powers.length >= 5) return;
    set('powers', [...state.powers, trimmed]);
    setNewPower('');
    clearDerived();
    powerInputRef.current?.focus();
  }

  function removePower(i: number) {
    set('powers', state.powers.filter((_, idx) => idx !== i));
    clearDerived();
  }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Supernatural Powers</h2>
      {derived && (
        <p className="wizard-derived-notice typewriter-label">Pre-filled from type — edit freely.</p>
      )}
      <p className="wizard-step-hint typewriter-label">1–5 powers. What can it do that defies natural explanation?</p>

      <ul className="power-list">
        {state.powers.map((p, i) => (
          <li key={i} className="power-item">
            <span className="power-text">{p}</span>
            <button className="btn-ghost power-remove" onClick={() => removePower(i)} aria-label={`Remove ${p}`}>×</button>
          </li>
        ))}
        {state.powers.length === 0 && (
          <li className="power-empty typewriter-label">No powers yet.</li>
        )}
      </ul>

      {state.powers.length < 5 && (
        <div className="power-add-row">
          <input
            ref={powerInputRef}
            className="wizard-input power-add-input"
            type="text"
            value={newPower}
            onChange={(e) => setNewPower(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPower()}
            placeholder="Add a power…"
            maxLength={120}
          />
          <button className="btn-secondary" onClick={addPower} disabled={!newPower.trim()}>Add</button>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Attack ───────────────────────────────────────────────────────────

function StepAttack({
  state, set, derived, clearDerived,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  derived: boolean;
  clearDerived: () => void;
}) {
  function updateAttack(partial: Partial<ThreatAttack>) {
    set('attack', { ...state.attack, ...partial });
    clearDerived();
  }

  function toggleTag(tag: string) {
    const tags = state.attack.tags.includes(tag)
      ? state.attack.tags.filter((t) => t !== tag)
      : [...state.attack.tags, tag];
    updateAttack({ tags });
  }

  const harm = state.attack.harm;
  const harmWarning = harm < 3 ? 'Unusually low for a monster.' : harm > 5 ? 'High — make sure this is intentional.' : null;

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Attack</h2>
      {derived && (
        <p className="wizard-derived-notice typewriter-label">Pre-filled from type — edit freely.</p>
      )}

      <label className="wizard-label" htmlFor="attack-name">Attack name</label>
      <input
        id="attack-name"
        className="wizard-input"
        type="text"
        value={state.attack.name}
        onChange={(e) => updateAttack({ name: e.target.value })}
        placeholder="Savage mauling, Crushing embrace…"
        maxLength={80}
      />

      <label className="wizard-label">Harm <span className="wizard-label-hint typewriter-label">(3–5 typical)</span></label>
      <div className="stepper-row">
        <button className="stepper-btn" onClick={() => updateAttack({ harm: Math.max(1, harm - 1) })}>−</button>
        <span className="stepper-value">{harm}</span>
        <button className="stepper-btn" onClick={() => updateAttack({ harm: Math.min(10, harm + 1) })}>+</button>
      </div>
      {harmWarning && <p className="wizard-warning typewriter-label">{harmWarning}</p>}

      <label className="wizard-label">Tags</label>
      <div className="tag-grid">
        {ATTACK_TAGS.map((tag) => (
          <button
            key={tag}
            className={`tag-pill${state.attack.tags.includes(tag) ? ' tag-pill--active' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Armour ───────────────────────────────────────────────────────────

function StepArmour({
  state, set, derived, clearDerived,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  derived: boolean;
  clearDerived: () => void;
}) {
  const armour = state.armour ?? 0;
  const warning = armour > 2 ? 'Above 2 is exceptional — make sure it fits the concept.' : null;

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Armour</h2>
      {derived && (
        <p className="wizard-derived-notice typewriter-label">Pre-filled from type — edit freely.</p>
      )}
      <p className="wizard-step-hint typewriter-label">0–2 typical. 3+ is exceptional (stone hide, magical ward, etc.).</p>

      <div className="stepper-row stepper-row--large">
        <button className="stepper-btn" onClick={() => { set('armour', Math.max(0, armour - 1)); clearDerived(); }}>−</button>
        <span className="stepper-value stepper-value--large">{armour}</span>
        <button className="stepper-btn" onClick={() => { set('armour', Math.min(4, armour + 1)); clearDerived(); }}>+</button>
      </div>
      {warning && <p className="wizard-warning typewriter-label">{warning}</p>}
    </div>
  );
}

// ─── Step 5: Harm Capacity ────────────────────────────────────────────────────

function StepHarmCapacity({
  state, set, derived, clearDerived,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  derived: boolean;
  clearDerived: () => void;
}) {
  const hc = state.harmCapacity ?? 10;
  const warning = hc > 12 ? 'Above 12 is exceptional — usually only a big boss.' : null;

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Harm Capacity</h2>
      {derived && (
        <p className="wizard-derived-notice typewriter-label">Pre-filled from type — edit freely.</p>
      )}
      <p className="wizard-step-hint typewriter-label">7 minimum. Typical range is 8–12. 14+ is a true juggernaut.</p>

      <div className="stepper-row stepper-row--large">
        <button className="stepper-btn" onClick={() => { set('harmCapacity', Math.max(7, hc - 1)); clearDerived(); }}>−</button>
        <span className="stepper-value stepper-value--large">{hc}</span>
        <button className="stepper-btn" onClick={() => { set('harmCapacity', Math.min(20, hc + 1)); clearDerived(); }}>+</button>
      </div>
      {warning && <p className="wizard-warning typewriter-label">{warning}</p>}
    </div>
  );
}

// ─── Step 6: Weaknesses ───────────────────────────────────────────────────────

function StepWeaknesses({
  state, set,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}) {
  const [newCategory, setNewCategory] = useState<ThreatWeakness['category']>('direct');
  const [newText, setNewText] = useState('');

  function addWeakness() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    set('weaknesses', [...state.weaknesses, { category: newCategory, text: trimmed }]);
    setNewText('');
  }

  function removeWeakness(i: number) {
    set('weaknesses', state.weaknesses.filter((_, idx) => idx !== i));
  }

  function pickPreset(preset: string) {
    setNewText(preset);
  }

  const categoryLabels: Record<ThreatWeakness['category'], string> = {
    direct: 'Direct (something that harms it)',
    environment: 'Environment (a place or condition)',
    ritual: 'Ritual (an action or ceremony)',
  };

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Weaknesses</h2>
      <p className="wizard-step-hint typewriter-label">At least one required.</p>

      <div className="kill-note">
        <span className="kill-note-icon">☠</span>
        <span className="kill-note-text">{KILL_NOTE}</span>
      </div>

      {/* Existing weaknesses */}
      <ul className="weakness-list">
        {state.weaknesses.map((w, i) => (
          <li key={i} className="weakness-item">
            <span className="weakness-category typewriter-label">{w.category}</span>
            <span className="weakness-text">{w.text}</span>
            <button className="btn-ghost weakness-remove" onClick={() => removeWeakness(i)} aria-label="Remove weakness">×</button>
          </li>
        ))}
        {state.weaknesses.length === 0 && (
          <li className="weakness-empty typewriter-label">No weaknesses yet — add at least one.</li>
        )}
      </ul>

      {/* Add weakness */}
      <div className="weakness-add">
        <label className="wizard-label">Category</label>
        <div className="weakness-category-btns">
          {(['direct', 'environment', 'ritual'] as ThreatWeakness['category'][]).map((cat) => (
            <button
              key={cat}
              className={`tag-pill${newCategory === cat ? ' tag-pill--active' : ''}`}
              onClick={() => { setNewCategory(cat); setNewText(''); }}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="wizard-label">Quick presets</label>
        <div className="weakness-presets">
          {WEAKNESS_PRESETS[newCategory].map((preset) => (
            <button key={preset} className="weakness-preset" onClick={() => pickPreset(preset)}>
              {preset}
            </button>
          ))}
        </div>

        <label className="wizard-label" htmlFor="weakness-text">Weakness</label>
        <div className="weakness-input-row">
          <input
            id="weakness-text"
            className="wizard-input"
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWeakness()}
            placeholder={`Describe the ${newCategory} weakness…`}
            maxLength={200}
          />
          <button className="btn-secondary" onClick={addWeakness} disabled={!newText.trim()}>Add</button>
        </div>
        <p className="weakness-category-hint typewriter-label">{categoryLabels[newCategory]}</p>
      </div>
    </div>
  );
}

// ─── Step 7: Moves & Save ─────────────────────────────────────────────────────

function StepMoves({
  state, set, onSave, saving, error, isEdit, customMoveTriggerRef,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  isEdit: boolean;
  customMoveTriggerRef: React.RefObject<HTMLInputElement>;
}) {
  const [newTrigger, setNewTrigger] = useState('');
  const [newEffect, setNewEffect] = useState('');

  function toggleMove(move: string) {
    const next = state.standardMoves.includes(move)
      ? state.standardMoves.filter((m) => m !== move)
      : [...state.standardMoves, move];
    set('standardMoves', next);
  }

  function addCustomMove() {
    const trigger = newTrigger.trim();
    const effect = newEffect.trim();
    if (!trigger || !effect) return;
    set('customMoves', [...state.customMoves, { trigger, effect }]);
    setNewTrigger('');
    setNewEffect('');
    customMoveTriggerRef.current?.focus();
  }

  function removeCustomMove(i: number) {
    set('customMoves', state.customMoves.filter((_, idx) => idx !== i));
  }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Moves</h2>
      <p className="wizard-step-hint typewriter-label">
        Select standard moves this monster uses and add any custom moves.
      </p>

      <h3 className="wizard-subheading">Standard moves</h3>
      <ul className="move-checklist">
        {STANDARD_MOVES.map((move) => (
          <li key={move} className="move-check-item">
            <label className="move-check-label">
              <input
                type="checkbox"
                className="move-check-input"
                checked={state.standardMoves.includes(move)}
                onChange={() => toggleMove(move)}
              />
              <span>{move}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="wizard-subheading">Custom moves</h3>
      {state.customMoves.length > 0 && (
        <ul className="custom-move-list">
          {state.customMoves.map((m, i) => (
            <li key={i} className="custom-move-item">
              <div className="custom-move-trigger typewriter-label">When {m.trigger}</div>
              <div className="custom-move-effect">{m.effect}</div>
              <button className="btn-ghost custom-move-remove" onClick={() => removeCustomMove(i)}>×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="custom-move-add">
        <label className="wizard-label" htmlFor="move-trigger">Trigger</label>
        <input
          ref={customMoveTriggerRef}
          id="move-trigger"
          className="wizard-input"
          type="text"
          value={newTrigger}
          onChange={(e) => setNewTrigger(e.target.value)}
          placeholder="When the monster swallows someone whole…"
          maxLength={200}
        />
        <label className="wizard-label" htmlFor="move-effect">Effect</label>
        <input
          id="move-effect"
          className="wizard-input"
          type="text"
          value={newEffect}
          onChange={(e) => setNewEffect(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomMove()}
          placeholder="They suffer 2-harm and are cut off from the hunters…"
          maxLength={300}
        />
        <button className="btn-secondary" onClick={addCustomMove} disabled={!newTrigger.trim() || !newEffect.trim()}>
          Add move
        </button>
      </div>

      {/* Review summary before save */}
      <div className="review-summary">
        <h3 className="wizard-subheading">Quick review</h3>
        <dl className="review-dl">
          <dt>Name</dt><dd>{state.name}</dd>
          <dt>Type</dt><dd>{state.typeId} — {state.motivation}</dd>
          <dt>Attack</dt><dd>{state.attack.name} ({state.attack.harm}-harm {state.attack.tags.join(', ')})</dd>
          <dt>Armour</dt><dd>{state.armour}</dd>
          <dt>Harm capacity</dt><dd>{state.harmCapacity}</dd>
          <dt>Weaknesses</dt><dd>{state.weaknesses.length}</dd>
          <dt>Powers</dt><dd>{state.powers.length}</dd>
        </dl>
      </div>

      {error && <p className="wizard-error">{error}</p>}

      <div className="wizard-nav">
        <button className="btn-primary" onClick={onSave} disabled={saving || state.weaknesses.length === 0}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create monster'}
        </button>
        {state.weaknesses.length === 0 && (
          <p className="wizard-warning typewriter-label">Add at least one weakness before saving.</p>
        )}
      </div>
    </div>
  );
}
