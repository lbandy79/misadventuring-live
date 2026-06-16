/**
 * BystanderWizardPage — /keeper/bystanders/new  &  /keeper/bystanders/:id/edit
 *
 * 3-step wizard for creating or editing a Keeper bystander.
 * Admin-gated.
 *
 * Steps:
 *   0. Name & Description
 *   1. Type & Motivation
 *   2. Weapon & Save        — optional weapon (helpers especially); move checklist
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

const BYSTANDER_TYPES = [
  { id: 'busybody', motivation: 'to interfere in other people\'s plans' },
  { id: 'detective', motivation: 'to rule out explanations' },
  { id: 'gossip',    motivation: 'to pass on rumours' },
  { id: 'helper',    motivation: 'to join the hunt' },
  { id: 'innocent',  motivation: 'to do the right thing' },
  { id: 'official',  motivation: 'to be suspicious' },
  { id: 'skeptic',   motivation: 'to deny supernatural explanations' },
  { id: 'victim',    motivation: 'to put themselves in danger' },
  { id: 'witness',   motivation: 'to reveal information' },
];

const STANDARD_MOVES = [
  'Go off alone',
  'Argue with the hunters',
  'Get in the way',
  'Reveal something',
  'Confess their fears',
  'Freak out in terror',
  'Try to help the hunters',
  'Try to protect people',
  'Display inability or incompetence',
  'Seek help or comfort',
];

const WEAPON_TAGS = ['hand', 'close', 'far', 'loud', 'obvious', 'reload', 'slow'];

const STEPS = ['Name & Description', 'Type & Motivation', 'Weapon & Save'];

interface WizardState {
  name: string;
  description: string;
  typeId: string;
  motivation: string;
  weapon?: ThreatAttack;
  standardMoves: string[];
  customMoves: ThreatCustomMove[];
}

const EMPTY: WizardState = { name: '', description: '', typeId: '', motivation: '', standardMoves: [], customMoves: [] };

export default function BystanderWizardPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(EMPTY);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    getKeeperThreat(id).then((t) => {
      if (!t || t.category !== 'bystander') { navigate('/keeper'); return; }
      setState({ name: t.name, description: t.description, typeId: t.typeId, motivation: t.motivation, weapon: t.weapon, standardMoves: t.standardMoves ?? [], customMoves: t.customMoves ?? [] });
      setLoadingExisting(false);
    });
  }, [id, isEdit, navigate]);

  if (authLoading || loadingExisting) return <div className="page-card"><p className="typewriter-label">Loading…</p></div>;
  if (!isAdmin) return <div className="page-card"><p className="typewriter-label">Keeper access only.</p></div>;

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function selectType(typeId: string) {
    const motivation = BYSTANDER_TYPES.find((t) => t.id === typeId)?.motivation ?? '';
    setState((prev) => ({ ...prev, typeId, motivation }));
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
        category: 'bystander' as const,
        name: state.name.trim(), description: state.description.trim(),
        typeId: state.typeId, motivation: state.motivation,
        weapon: state.weapon,
        standardMoves: state.standardMoves, customMoves: state.customMoves,
      };
      if (isEdit && id) {
        await updateKeeperThreat(id, payload);
        navigate(`/keeper/bystanders/${id}`);
      } else {
        const created = await createKeeperThreat(payload);
        navigate(`/keeper/bystanders/${created.id}`);
      }
    } catch (err) {
      console.error(err); setError('Save failed. Try again.'); setSaving(false);
    }
  }

  return (
    <section className="page-card monster-wizard">
      <header className="wizard-header">
        <Link to="/keeper" className="wizard-back-link typewriter-label">← Compendium</Link>
        <h1 className="wizard-title">{isEdit ? 'Edit Bystander' : 'New Bystander'}</h1>
      </header>
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step-dot${i === step ? ' wizard-step-dot--active' : ''}${i < step ? ' wizard-step-dot--done' : ''}`} title={label} />
        ))}
      </div>
      <p className="wizard-step-label typewriter-label">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
      <div className="wizard-body">
        {step === 0 && <NameDescStep state={state} set={set} placeholder="Deputy Harris, Old Mrs. Crane…" />}
        {step === 1 && (
          <div className="wizard-step">
            <h2 className="wizard-step-heading">Type & Motivation</h2>
            <p className="wizard-step-hint typewriter-label">Pick by narrative role, not literal description. Default unknowns to witness (has clues) or victim (otherwise).</p>
            <div className="type-grid">
              {BYSTANDER_TYPES.map((t) => (
                <button key={t.id} className={`type-card${state.typeId === t.id ? ' type-card--selected' : ''}`} onClick={() => selectType(t.id)}>
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
        )}
        {step === 2 && <BystanderFinalStep state={state} set={set} onSave={handleSave} saving={saving} error={error} isEdit={isEdit} />}
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

function NameDescStep({ state, set, placeholder }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; placeholder: string }) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Name & Description</h2>
      <p className="wizard-step-hint typewriter-label">Who are they? What's their deal? What makes them memorable?</p>
      <label className="wizard-label" htmlFor="name">Name</label>
      <input id="name" className="wizard-input" type="text" value={state.name} onChange={(e) => set('name', e.target.value)} placeholder={placeholder} maxLength={80} autoFocus />
      <label className="wizard-label" htmlFor="desc">Description</label>
      <textarea id="desc" className="wizard-textarea" value={state.description} onChange={(e) => set('description', e.target.value)} placeholder="Who they are, how they dress, what they want, what they're hiding…" rows={5} maxLength={800} />
    </div>
  );
}

function BystanderFinalStep({ state, set, onSave, saving, error, isEdit }: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onSave: () => void; saving: boolean; error: string | null; isEdit: boolean;
}) {
  const [hasWeapon, setHasWeapon] = useState(Boolean(state.weapon));
  const [newTrigger, setNewTrigger] = useState('');
  const [newEffect, setNewEffect] = useState('');

  function toggleWeapon(enabled: boolean) {
    setHasWeapon(enabled);
    if (!enabled) set('weapon', undefined);
    else set('weapon', { name: '', harm: 1, tags: [] });
  }
  function updateWeapon(partial: Partial<ThreatAttack>) { set('weapon', { ...(state.weapon ?? { name: '', harm: 1, tags: [] }), ...partial }); }
  function toggleTag(tag: string) {
    const tags = (state.weapon?.tags ?? []).includes(tag) ? (state.weapon?.tags ?? []).filter((t) => t !== tag) : [...(state.weapon?.tags ?? []), tag];
    updateWeapon({ tags });
  }
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
      <h2 className="wizard-step-heading">Weapon & Moves</h2>
      <h3 className="wizard-subheading">Weapon</h3>
      <p className="wizard-step-hint typewriter-label">Only stat a weapon if they're likely to fight — helpers especially. Most bystanders default to 7-harm.</p>
      <div className="weakness-category-btns">
        <button className={`tag-pill${!hasWeapon ? ' tag-pill--active' : ''}`} onClick={() => toggleWeapon(false)}>No weapon</button>
        <button className={`tag-pill${hasWeapon ? ' tag-pill--active' : ''}`} onClick={() => toggleWeapon(true)}>Has weapon</button>
      </div>
      {hasWeapon && state.weapon && (
        <div className="wizard-step" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
          <label className="wizard-label" htmlFor="weapon-name">Weapon name</label>
          <input id="weapon-name" className="wizard-input" type="text" value={state.weapon.name} onChange={(e) => updateWeapon({ name: e.target.value })} placeholder="Hunting rifle, Kitchen knife…" maxLength={80} />
          <label className="wizard-label">Harm</label>
          <div className="stepper-row">
            <button className="stepper-btn" onClick={() => updateWeapon({ harm: Math.max(1, (state.weapon?.harm ?? 1) - 1) })}>−</button>
            <span className="stepper-value">{state.weapon.harm}</span>
            <button className="stepper-btn" onClick={() => updateWeapon({ harm: Math.min(5, (state.weapon?.harm ?? 1) + 1) })}>+</button>
          </div>
          <label className="wizard-label">Tags</label>
          <div className="tag-grid">
            {WEAPON_TAGS.map((tag) => (
              <button key={tag} className={`tag-pill${(state.weapon?.tags ?? []).includes(tag) ? ' tag-pill--active' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
        </div>
      )}
      <h3 className="wizard-subheading">Keeper moves</h3>
      <ul className="move-checklist">
        {STANDARD_MOVES.map((move) => (
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
        <input id="trigger" className="wizard-input" type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} placeholder="When the witness tries to go to the police…" maxLength={200} />
        <label className="wizard-label" htmlFor="effect">Effect</label>
        <input id="effect" className="wizard-input" type="text" value={newEffect} onChange={(e) => setNewEffect(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomMove()} placeholder="Something stops them at the last moment…" maxLength={300} />
        <button className="btn-secondary" onClick={addCustomMove} disabled={!newTrigger.trim() || !newEffect.trim()}>Add move</button>
      </div>
      {error && <p className="wizard-error">{error}</p>}
      <div className="wizard-nav">
        <button className="btn-secondary" onClick={() => {}}>Back</button>
        <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create bystander'}</button>
      </div>
    </div>
  );
}
