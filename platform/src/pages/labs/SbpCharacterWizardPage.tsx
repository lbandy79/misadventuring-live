/**
 * SbpCharacterWizardPage — /labs/sbp/characters/new
 *
 * Level-1 character creation for Soggy Bottom Pirates. Cast-gated. Rules
 * come from Firestore after sign-in (never the bundle). Each step is its own
 * component under components/sbp/wizard/; this file owns the draft, the
 * step order, and the save.
 *
 * "Can I go next?" is answered by the derivation layer: a step is complete
 * when deriveCharacter reports no pending choices or issues that belong to
 * it, so the wizard follows the data rather than hardcoding rules.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DEFAULT_ABILITY_SCORE_CONFIG,
  abilityScoreConfigFrom,
  createSbpCharacter,
  deriveCharacter,
  useAuth,
  validateBaseScores,
  type SbpCharacter,
} from '@mtp/lib';
import { Doodle } from '../../components/Doodle';
import { SbpHeader, SbpPage, useSbpGate } from '../../components/sbp/SbpPage';
import { useSbpRules } from '../../components/sbp/useSbpRules';
import { SpeciesStep } from '../../components/sbp/wizard/SpeciesStep';
import { BackgroundStep } from '../../components/sbp/wizard/BackgroundStep';
import { ClassStep } from '../../components/sbp/wizard/ClassStep';
import { AbilityScoresStep, defaultScores } from '../../components/sbp/wizard/AbilityScoresStep';
import { ChoicesStep } from '../../components/sbp/wizard/ChoicesStep';
import { ReviewStep } from '../../components/sbp/wizard/ReviewStep';
import type { WizardRules } from '../../components/sbp/wizard/types';

type StepId = 'species' | 'background' | 'class' | 'abilities' | 'choices' | 'review';

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'species', label: 'Species' },
  { id: 'background', label: 'Background' },
  { id: 'class', label: 'Class' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'choices', label: 'Picks' },
  { id: 'review', label: 'Review' },
];

export default function SbpCharacterWizardPage() {
  const gate = useSbpGate();
  const { user, isCast, isAdmin } = useAuth();
  const { rules, loading, error } = useSbpRules(!!user && (isCast || isAdmin));

  if (gate) return gate;
  if (error) {
    return (
      <SbpPage>
        <SbpHeader title="Couldn't load the rules." back={{ to: '/labs/sbp', label: 'Labs' }} />
        <p className="wizard-error">{error}</p>
      </SbpPage>
    );
  }
  if (loading) {
    return <SbpPage><p className="join-loading">Loading the sourcebook…</p></SbpPage>;
  }
  if (!rules.classes || !rules.origins) {
    return (
      <SbpPage>
        <SbpHeader title="The sourcebook isn't uploaded yet." back={{ to: '/labs/sbp', label: 'Labs' }} />
        <p className="join-subtitle">An admin needs to upload the rules files on the Admin page first.</p>
      </SbpPage>
    );
  }

  return (
    <Wizard
      rules={{ classes: rules.classes.data, origins: rules.origins.data, loaded: rules }}
      owner={{ uid: user!.uid, email: user!.email ?? '' }}
    />
  );
}

// ─── Wizard proper (only mounts once rules + user exist) ──────────────────────

function Wizard({ rules, owner }: { rules: WizardRules; owner: { uid: string; email: string } }) {
  const navigate = useNavigate();
  const config = useMemo(() => abilityScoreConfigFrom(rules.origins), [rules.origins]);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SbpCharacter>(() => ({
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    name: '',
    level: 1,
    speciesId: '',
    backgroundId: '',
    classId: '',
    abilityScores: { method: 'standard_array', base: defaultScores('standard_array', config.standardArray) },
    choices: { '1': {} },
    rulesVersion: {
      classes: rules.loaded.classes?.meta.uploadedAt ?? null,
      origins: rules.loaded.origins?.meta.uploadedAt ?? null,
    },
    createdAt: 0,
    updatedAt: 0,
  }));

  const step = STEPS[stepIndex];
  const complete = useMemo(() => isStepComplete(step.id, draft, rules), [step.id, draft, rules]);

  function goTo(i: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const { id: _drop, createdAt: _c, updatedAt: _u, ...input } = draft;
      await createSbpCharacter({ ...input, name: draft.name.trim() });
      navigate('/labs/sbp');
    } catch (err) {
      console.error('sbp character save failed:', err);
      setSaveError(`Couldn't save: ${(err as Error).message}`);
      setSaving(false);
    }
  }

  const stepProps = { draft, rules, onChange: setDraft };

  return (
    <SbpPage className="sbp-wizard">
      <Doodle name="cereal" top="-22px" right="-26px" rotation={-10} opacity={0.75} width="96px" />
      <header className="wizard-header">
        <Link to="/labs/sbp" className="wizard-back-link">← Labs</Link>
        <h1 className="wizard-title">New character</h1>
      </header>

      <div className="wizard-steps" aria-label="Wizard progress">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`wizard-step-dot${i === stepIndex ? ' wizard-step-dot--active' : ''}${i < stepIndex ? ' wizard-step-dot--done' : ''}`}
          />
        ))}
      </div>
      <p className="wizard-step-label">Step {stepIndex + 1} of {STEPS.length} — {step.label}</p>

      <div className="wizard-body">
        {step.id === 'species' && <SpeciesStep {...stepProps} />}
        {step.id === 'background' && <BackgroundStep {...stepProps} />}
        {step.id === 'class' && <ClassStep {...stepProps} />}
        {step.id === 'abilities' && <AbilityScoresStep {...stepProps} />}
        {step.id === 'choices' && <ChoicesStep {...stepProps} />}
        {step.id === 'review' && <ReviewStep {...stepProps} />}
      </div>

      {saveError && <p className="wizard-error">{saveError}</p>}

      <div className="wizard-nav">
        {stepIndex > 0 && (
          <button type="button" className="btn-secondary" onClick={() => goTo(stepIndex - 1)} disabled={saving}>Back</button>
        )}
        {step.id !== 'review' ? (
          <button type="button" className="btn-primary" onClick={() => goTo(stepIndex + 1)} disabled={!complete}>Next</button>
        ) : (
          <button type="button" className="btn-primary" onClick={save} disabled={!complete || saving}>
            {saving ? 'Saving…' : 'Save character'}
          </button>
        )}
      </div>
    </SbpPage>
  );
}

// ─── Completion rules per step ────────────────────────────────────────────────

function isStepComplete(step: StepId, draft: SbpCharacter, rules: WizardRules): boolean {
  switch (step) {
    case 'species':
      return !!draft.speciesId;
    case 'background':
      return !!draft.backgroundId;
    case 'class': {
      if (!draft.classId) return false;
      const klass = rules.classes.classes.find((k) => k.id === draft.classId);
      const arch = klass?.archetype;
      if (arch && arch.entry_level === 1) return !!draft.choices['1']?.archetypeId;
      return true;
    }
    case 'abilities':
      return validateBaseScores(
        draft.abilityScores.method,
        draft.abilityScores.base,
        abilityScoreConfigFrom(rules.origins) ?? DEFAULT_ABILITY_SCORE_CONFIG,
      ).length === 0;
    case 'choices': {
      const d = deriveCharacter(draft, rules.loaded);
      return d.pendingChoices.length === 0 && d.issues.length === 0;
    }
    case 'review': {
      const d = deriveCharacter(draft, rules.loaded);
      return draft.name.trim().length > 0 && d.ok && d.pendingChoices.length === 0;
    }
  }
}
