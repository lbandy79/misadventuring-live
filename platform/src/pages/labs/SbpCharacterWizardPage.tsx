/**
 * SbpCharacterWizardPage — /labs/sbp/characters/new
 *                        — /labs/sbp/characters/:id/edit
 *
 * Level-1 character creation and editing for Soggy Bottom Pirates.
 * Cast-gated. Rules come from Firestore after sign-in (never the bundle).
 * Each step is its own component under components/sbp/wizard/; this file
 * owns the draft, the step order, and the save.
 *
 * "Can I go next?" is answered by the derivation layer: a step is complete
 * when deriveCharacter reports nothing pending that belongs to it, so the
 * wizard follows the data rather than hardcoding rules.
 *
 * Editing keeps the character's level and every choice above level 1; those
 * are managed on the sheet. Saving stamps the current rules version.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  abilityScoreConfigFrom,
  createSbpCharacter,
  deriveCharacter,
  getSbpCharacter,
  saveSbpCharacter,
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
  const { id: editId } = useParams<{ id?: string }>();
  const { user, isCast, isAdmin } = useAuth();
  const enabled = !!user && (isCast || isAdmin);
  const { rules, loading, error } = useSbpRules(enabled);
  const [existing, setExisting] = useState<SbpCharacter | null | undefined>(editId ? undefined : null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId || !enabled) return;
    getSbpCharacter(editId)
      .then((c) => setExisting(c))
      .catch((err) => {
        console.error('sbp character load failed:', err);
        setLoadError(`Couldn't load that character: ${(err as Error).message}`);
      });
  }, [editId, enabled]);

  if (gate) return gate;
  const back = { to: '/labs/sbp', label: 'Labs' };
  if (error || loadError) {
    return (
      <SbpPage>
        <SbpHeader title="Something went sideways." back={back} />
        <p className="wizard-error">{error ?? loadError}</p>
      </SbpPage>
    );
  }
  if (loading || existing === undefined) {
    return <SbpPage><p className="join-loading">Loading the sourcebook…</p></SbpPage>;
  }
  if (!rules.classes || !rules.origins) {
    return (
      <SbpPage>
        <SbpHeader title="The sourcebook isn't uploaded yet." back={back} />
        <p className="join-subtitle">An admin needs to upload the rules files on the Admin page first.</p>
      </SbpPage>
    );
  }
  if (editId && !existing) {
    return (
      <SbpPage>
        <SbpHeader title="That character doesn't exist." back={back} />
      </SbpPage>
    );
  }
  if (existing && existing.ownerUid !== user!.uid && !isAdmin) {
    return (
      <SbpPage>
        <SbpHeader title="That's not your character." back={back} />
        <p className="join-subtitle">Only the player who made it (or an admin) can edit it.</p>
      </SbpPage>
    );
  }

  return (
    <Wizard
      key={existing?.id ?? 'new'}
      rules={{ classes: rules.classes.data, origins: rules.origins.data, loaded: rules }}
      owner={{ uid: user!.uid, email: user!.email ?? '', name: user!.displayName ?? '' }}
      existing={existing}
    />
  );
}

// ─── Wizard proper (only mounts once rules + user exist) ──────────────────────

function Wizard({
  rules, owner, existing,
}: {
  rules: WizardRules;
  owner: { uid: string; email: string; name: string };
  existing: SbpCharacter | null;
}) {
  const navigate = useNavigate();
  const editing = !!existing;
  const config = useMemo(() => abilityScoreConfigFrom(rules.origins), [rules.origins]);
  const [stepIndex, setStepIndex] = useState(editing ? STEPS.length - 1 : 0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SbpCharacter>(() => existing ?? {
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    ownerName: owner.name || undefined,
    name: '',
    level: 1,
    speciesId: '',
    backgroundId: '',
    classId: '',
    abilityScores: { method: 'standard_array', base: defaultScores('standard_array', config.standardArray) },
    choices: { '1': {} },
    rulesVersion: { classes: null, origins: null },
    createdAt: 0,
    updatedAt: 0,
  });

  const step = STEPS[stepIndex];
  const completion = useMemo(
    () => Object.fromEntries(STEPS.map((s) => [s.id, isStepComplete(s.id, draft, rules)])) as Record<StepId, boolean>,
    [draft, rules],
  );
  const allComplete = STEPS.every((s) => completion[s.id]);

  function goTo(i: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const rulesVersion = {
      classes: rules.loaded.classes?.meta.uploadedAt ?? null,
      origins: rules.loaded.origins?.meta.uploadedAt ?? null,
    };
    try {
      if (existing?.id) {
        await saveSbpCharacter(existing.id, {
          name: draft.name.trim(),
          speciesId: draft.speciesId,
          backgroundId: draft.backgroundId,
          classId: draft.classId,
          abilityScores: draft.abilityScores,
          choices: draft.choices,
          rulesVersion,
        });
      } else {
        const { id: _drop, createdAt: _c, updatedAt: _u, ...input } = draft;
        await createSbpCharacter({ ...input, name: draft.name.trim(), rulesVersion });
      }
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
        <h1 className="wizard-title">{editing ? `Edit ${existing!.name}` : 'New character'}</h1>
      </header>

      {editing ? (
        <nav className="sbp-step-jump" aria-label="Jump to step">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === stepIndex ? 'step' : undefined}
              className={completion[s.id] ? '' : 'is-incomplete'}
              onClick={() => goTo(i)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      ) : (
        <>
          <div className="wizard-steps" aria-label="Wizard progress">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`wizard-step-dot${i === stepIndex ? ' wizard-step-dot--active' : ''}${i < stepIndex ? ' wizard-step-dot--done' : ''}`}
              />
            ))}
          </div>
          <p className="wizard-step-label">Step {stepIndex + 1} of {STEPS.length} — {step.label}</p>
        </>
      )}

      {editing && draft.level > 1 && (
        <p className="wizard-derived-notice">
          Editing the level-1 build. This character is level {draft.level}; its higher-level picks are kept.
        </p>
      )}

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
        {step.id !== 'review' && (
          <button type="button" className="btn-primary" onClick={() => goTo(stepIndex + 1)} disabled={!completion[step.id]}>Next</button>
        )}
        {(step.id === 'review' || editing) && (
          <button type="button" className="btn-primary" onClick={save} disabled={!allComplete || saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save character'}
          </button>
        )}
        {editing && (
          <Link to="/labs/sbp" className="btn-ghost">Cancel</Link>
        )}
      </div>
    </SbpPage>
  );
}

// ─── Completion rules per step ────────────────────────────────────────────────

/** Only level-1 choices belong to the wizard; higher ones live on the sheet. */
function pendingAtLevel1(draft: SbpCharacter, rules: WizardRules) {
  return deriveCharacter(draft, rules.loaded).pendingChoices.filter((p) => p.level === 1);
}

function isStepComplete(step: StepId, draft: SbpCharacter, rules: WizardRules): boolean {
  switch (step) {
    case 'species':
      return rules.origins.species.some((s) => s.id === draft.speciesId);
    case 'background':
      return rules.origins.backgrounds.some((b) => b.id === draft.backgroundId);
    case 'class': {
      const klass = rules.classes.classes.find((k) => k.id === draft.classId);
      if (!klass) return false;
      const arch = klass.archetype;
      if (arch && arch.entry_level === 1) return !!draft.choices['1']?.archetypeId;
      return true;
    }
    case 'abilities':
      return validateBaseScores(
        draft.abilityScores.method,
        draft.abilityScores.base,
        abilityScoreConfigFrom(rules.origins),
      ).length === 0;
    case 'choices': {
      const d = deriveCharacter(draft, rules.loaded);
      return pendingAtLevel1(draft, rules).length === 0 && d.issues.length === 0;
    }
    case 'review': {
      const d = deriveCharacter(draft, rules.loaded);
      return draft.name.trim().length > 0 && d.ok && pendingAtLevel1(draft, rules).length === 0;
    }
  }
}
