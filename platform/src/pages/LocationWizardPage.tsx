/**
 * LocationWizardPage — /keeper/locations/new  &  /keeper/locations/:id/edit
 *
 * 3-step wizard for creating or editing a Keeper location.
 * Admin-gated.
 *
 * Steps:
 *   0. Name & Description
 *   1. Type & Motivation
 *   2. Moves & Save
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import {
  createKeeperThreat,
  getKeeperThreat,
  updateKeeperThreat,
  type ThreatCustomMove,
} from '../../../src/lib/threats/threatApi';

const LOCATION_TYPES = [
  { id: 'crossroads', motivation: 'to bring people, and things, together' },
  { id: 'deathtrap',  motivation: 'to harm intruders' },
  { id: 'den',        motivation: 'to harbour monsters' },
  { id: 'fortress',   motivation: 'to deny entry' },
  { id: 'hellgate',   motivation: 'to create evil' },
  { id: 'hub',        motivation: 'to reveal information' },
  { id: 'lab',        motivation: 'to create weirdness' },
  { id: 'maze',       motivation: 'to confuse and separate' },
  { id: 'prison',     motivation: 'to constrain and prevent exit' },
  { id: 'wilds',      motivation: 'to contain hidden things' },
];

const STANDARD_MOVES = [
  'Present a hazard',
  'Reveal something',
  'Hide something',
  'Close a way',
  'Open a way',
  'Reshape itself',
  'Trap someone',
  'Offer a guide',
  'Present a guardian',
  'Something doesn\'t work properly',
  'Create a particular feeling',
];

const STEPS = ['Name & Description', 'Type & Motivation', 'Moves & Save'];

interface WizardState {
  name: string;
  description: string;
  typeId: string;
  motivation: string;
  standardMoves: string[];
  customMoves: ThreatCustomMove[];
}

const EMPTY: WizardState = { name: '', description: '', typeId: '', motivation: '', standardMoves: [], customMoves: [] };

export default function LocationWizardPage() {
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
      if (!t || t.category !== 'location') { navigate('/keeper'); return; }
      setState({ name: t.name, description: t.description, typeId: t.typeId, motivation: t.motivation, standardMoves: t.standardMoves ?? [], customMoves: t.customMoves ?? [] });
      setLoadingExisting(false);
    });
  }, [id, isEdit, navigate]);

  if (authLoading || loadingExisting) return <div className="page-card"><p className="typewriter-label">Loading…</p></div>;
  if (!isAdmin) return <div className="page-card"><p className="typewriter-label">Keeper access only.</p></div>;

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
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
        category: 'location' as const,
        name: state.name.trim(), description: state.description.trim(),
        typeId: state.typeId, motivation: state.motivation,
        standardMoves: state.standardMoves, customMoves: state.customMoves,
      };
      if (isEdit && id) {
        await updateKeeperThreat(id, payload);
        navigate(`/keeper/locations/${id}`);
      } else {
        const created = await createKeeperThreat(payload);
        navigate(`/keeper/locations/${created.id}`);
      }
    } catch (err) {
      console.error(err); setError('Save failed. Try again.'); setSaving(false);
    }
  }

  return (
    <section className="page-card monster-wizard">
      <header className="wizard-header">
        <Link to="/keeper" className="wizard-back-link typewriter-label">← Compendium</Link>
        <h1 className="wizard-title">{isEdit ? 'Edit Location' : 'New Location'}</h1>
      </header>
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step-dot${i === step ? ' wizard-step-dot--active' : ''}${i < step ? ' wizard-step-dot--done' : ''}`} title={label} />
        ))}
      </div>
      <p className="wizard-step-label typewriter-label">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

      <div className="wizard-body">
        {step === 0 && (
          <div className="wizard-step">
            <h2 className="wizard-step-heading">Name & Description</h2>
            <p className="wizard-step-hint typewriter-label">Describe the place visually — atmosphere, what's wrong with it, what it feels like to be there.</p>
            <label className="wizard-label" htmlFor="name">Name</label>
            <input id="name" className="wizard-input" type="text" value={state.name} onChange={(e) => set('name', e.target.value)} placeholder="The Harrow House, Millbrook Reservoir…" maxLength={80} autoFocus />
            <label className="wizard-label" htmlFor="desc">Description</label>
            <textarea id="desc" className="wizard-textarea" value={state.description} onChange={(e) => set('description', e.target.value)} placeholder="What it looks like, what's wrong with it, what it feels like to be there…" rows={5} maxLength={800} />
          </div>
        )}
        {step === 1 && (
          <div className="wizard-step">
            <h2 className="wizard-step-heading">Type & Motivation</h2>
            <p className="wizard-step-hint typewriter-label">Pick by what the place is <em>emotionally</em>, not literally. A hospital can be a deathtrap. A bar can be a crossroads.</p>
            <div className="type-grid">
              {LOCATION_TYPES.map((t) => (
                <button key={t.id} className={`type-card${state.typeId === t.id ? ' type-card--selected' : ''}`} onClick={() => setState((prev) => ({ ...prev, typeId: t.id, motivation: t.motivation }))}>
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
        {step === 2 && <LocationMovesStep state={state} set={set} onSave={handleSave} saving={saving} error={error} isEdit={isEdit} />}
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

function LocationMovesStep({ state, set, onSave, saving, error, isEdit }: {
  state: WizardState;
  set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onSave: () => void; saving: boolean; error: string | null; isEdit: boolean;
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
      <p className="wizard-step-hint typewriter-label">Choose which moves this location uses to make trouble.</p>
      <h3 className="wizard-subheading">Standard moves</h3>
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
        <input id="trigger" className="wizard-input" type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} placeholder="When someone tries to leave the building…" maxLength={200} />
        <label className="wizard-label" htmlFor="effect">Effect</label>
        <input id="effect" className="wizard-input" type="text" value={newEffect} onChange={(e) => setNewEffect(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomMove()} placeholder="Every exit leads back to the same hallway…" maxLength={300} />
        <button className="btn-secondary" onClick={addCustomMove} disabled={!newTrigger.trim() || !newEffect.trim()}>Add move</button>
      </div>
      {error && <p className="wizard-error">{error}</p>}
      <div className="wizard-nav">
        <button className="btn-secondary" onClick={() => {}}>Back</button>
        <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create location'}</button>
      </div>
    </div>
  );
}
