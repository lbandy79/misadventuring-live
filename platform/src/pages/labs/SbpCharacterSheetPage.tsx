/**
 * SbpCharacterSheetPage — /labs/sbp/characters/:id
 *
 * The living sheet: derived stats at the current level, level up and down,
 * and the choices each level unlocks (archetype at its entry level, ability
 * increase or feat at each ASI level, and anything a feature's grants ask
 * for). Changes are held locally until Save, which also stamps the rules
 * version the character was checked against.
 *
 * Levelling down leaves higher-level choices dormant (BRIEF §8.2); the
 * "Discard choices above level N" button is the deliberate throw-away.
 *
 * Any cast member can view any character; only the owner or an admin edits.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  clearChoicesAbove,
  deriveCharacter,
  deleteSbpCharacter,
  getSbpCharacter,
  saveSbpCharacter,
  setLevel,
  useAuth,
  withChoices,
  MAX_LEVEL,
  MIN_LEVEL,
  type AsiChoice,
  type FeatChoice,
  type GrantChoiceRequest,
  type SbpCharacter,
} from '@mtp/lib';
import { Doodle } from '../../components/Doodle';
import { SbpHeader, SbpPage, useSbpGate } from '../../components/sbp/SbpPage';
import { useSbpRules } from '../../components/sbp/useSbpRules';
import { DerivedSummary } from '../../components/sbp/DerivedSummary';
import { ArchetypePicker, AsiOrFeatPicker, GrantPickPicker, eligibleFeats } from '../../components/sbp/pickers';
import type { WizardRules } from '../../components/sbp/wizard/types';

export default function SbpCharacterSheetPage() {
  const gate = useSbpGate();
  const { id } = useParams<{ id: string }>();
  const { user, isCast, isAdmin } = useAuth();
  const enabled = !!user && (isCast || isAdmin);
  const { rules, loading, error } = useSbpRules(enabled);
  const [character, setCharacter] = useState<SbpCharacter | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !enabled) return;
    getSbpCharacter(id)
      .then(setCharacter)
      .catch((err) => {
        console.error('sbp character load failed:', err);
        setLoadError(`Couldn't load that character: ${(err as Error).message}`);
      });
  }, [id, enabled]);

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
  if (loading || character === undefined) {
    return <SbpPage><p className="join-loading">Loading the sheet…</p></SbpPage>;
  }
  if (!character) {
    return <SbpPage><SbpHeader title="That character doesn't exist." back={back} /></SbpPage>;
  }
  if (!rules.classes || !rules.origins) {
    return (
      <SbpPage>
        <SbpHeader title="The sourcebook isn't uploaded yet." back={back} />
      </SbpPage>
    );
  }

  return (
    <Sheet
      key={character.id}
      initial={character}
      rules={{ classes: rules.classes.data, origins: rules.origins.data, loaded: rules }}
      canEdit={character.ownerUid === user!.uid || isAdmin}
    />
  );
}

// ─── Sheet proper ─────────────────────────────────────────────────────────────

function Sheet({ initial, rules, canEdit }: { initial: SbpCharacter; rules: WizardRules; canEdit: boolean }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const derived = useMemo(() => deriveCharacter(draft, rules.loaded), [draft, rules]);
  const dirty = draft !== saved;
  const klass = rules.classes.classes.find((k) => k.id === draft.classId);

  // Every choice slot at ≤ current level, grouped by level. Level-1 basics
  // (skills, size, tools) are edited in the wizard; grant picks show here too.
  const levelSlots = useMemo(() => {
    const byLevel = new Map<number, { archetype: boolean; asi: boolean; grants: GrantChoiceRequest[] }>();
    const slot = (n: number) => {
      if (!byLevel.has(n)) byLevel.set(n, { archetype: false, asi: false, grants: [] });
      return byLevel.get(n)!;
    };
    if (klass) {
      for (let n = 1; n <= draft.level; n++) {
        if (klass.archetype?.entry_level === n) slot(n).archetype = true;
        const row = klass.levels.find((L) => L.level === n) ?? klass.levels[n - 1];
        if (row?.asi_or_feat) slot(n).asi = true;
      }
    }
    for (const g of derived.grantChoices) slot(g.level).grants.push(g);
    return [...byLevel.entries()].sort((a, b) => a[0] - b[0]);
  }, [klass, draft.level, derived.grantChoices]);

  const archGroup = klass?.archetype
    ? rules.classes.archetypes[klass.archetype.choices_ref.replace(/^archetypes\./, '')]
    : undefined;

  /** Feat ids the character already holds anywhere, for the "no repeats" rule. */
  const takenFeatIds = useMemo(() => {
    const ids: string[] = [];
    const bg = rules.origins.backgrounds.find((b) => b.id === draft.backgroundId);
    if (bg) ids.push(bg.origin_feat);
    for (const [lvl, c] of Object.entries(draft.choices)) {
      if (Number(lvl) > draft.level) continue;
      if (c.asiOrFeat?.type === 'feat') ids.push(c.asiOrFeat.featId);
      for (const picks of Object.values(c.grantPicks ?? {})) ids.push(...picks.filter((p) => p.startsWith('feat.')));
    }
    return ids;
  }, [draft, rules.origins.backgrounds]);

  function changeLevel(n: number) {
    setDraft((d) => setLevel(d, n));
  }

  function setAsi(level: number, next: AsiChoice | FeatChoice | undefined) {
    setDraft((d) => withChoices(d, level, { asiOrFeat: next }));
  }

  function setGrant(level: number, key: string, picks: string[]) {
    setDraft((d) => withChoices(d, level, { grantPicks: { ...(d.choices[String(level)]?.grantPicks ?? {}), [key]: picks } }));
  }

  function discardAbove() {
    if (!confirm(`Throw away every choice saved above level ${draft.level}? Levelling back up will ask for them again.`)) return;
    setDraft((d) => clearChoicesAbove(d, d.level));
  }

  async function save() {
    if (!draft.id) return;
    setSaving(true);
    setNotice(null);
    const rulesVersion = {
      classes: rules.loaded.classes?.meta.uploadedAt ?? null,
      origins: rules.loaded.origins?.meta.uploadedAt ?? null,
    };
    try {
      await saveSbpCharacter(draft.id, { level: draft.level, choices: draft.choices, rulesVersion });
      const next = { ...draft, rulesVersion, updatedAt: Date.now() };
      setSaved(next);
      setDraft(next);
      setNotice('Saved.');
    } catch (err) {
      console.error('sbp character save failed:', err);
      setNotice(`Couldn't save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft.id || !confirm(`Delete "${draft.name}"? This can't be undone.`)) return;
    try {
      await deleteSbpCharacter(draft.id);
      navigate('/labs/sbp');
    } catch (err) {
      setNotice(`Couldn't delete: ${(err as Error).message}`);
    }
  }

  const outdated = derived.rulesOutdated.classes || derived.rulesOutdated.origins;

  return (
    <SbpPage wide className="sbp-sheet">
      <Doodle name="cereal" top="-22px" right="-26px" rotation={-10} opacity={0.6} width="90px" />
      <header className="wizard-header sbp-sheet__header">
        <Link to="/labs/sbp" className="wizard-back-link">← Labs</Link>
        <h1 className="wizard-title">{draft.name}</h1>
        {!canEdit && <span className="sbp-muted">{draft.ownerEmail}'s character · read only</span>}
      </header>

      <div className="sbp-level-bar">
        <div className="stepper-row">
          <button type="button" className="stepper-btn" onClick={() => changeLevel(draft.level - 1)} disabled={!canEdit || draft.level <= MIN_LEVEL} aria-label="Level down">−</button>
          <span className="stepper-value stepper-value--large" aria-live="polite">Lv {draft.level}</span>
          <button type="button" className="stepper-btn" onClick={() => changeLevel(draft.level + 1)} disabled={!canEdit || draft.level >= MAX_LEVEL} aria-label="Level up">+</button>
        </div>
        {canEdit && (
          <div className="sbp-level-bar__actions">
            <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
            </button>
            {dirty && <button type="button" className="btn-ghost" onClick={() => setDraft(saved)} disabled={saving}>Discard changes</button>}
            <Link to={`/labs/sbp/characters/${draft.id}/edit`} className="btn-secondary sbp-edit">Edit build</Link>
            <button type="button" className="btn-ghost sbp-danger" onClick={remove}>Delete</button>
          </div>
        )}
      </div>

      {notice && <p className={notice.startsWith("Couldn't") ? 'wizard-error' : 'sbp-notice'} role="status">{notice}</p>}
      {outdated && (
        <p className="wizard-derived-notice">
          The rules have been updated since this character was last saved. Check the picks below, then Save to clear this.
        </p>
      )}
      {derived.issues.map((msg) => <p key={msg} className="wizard-warning">{msg}</p>)}
      {derived.dormantLevels.length > 0 && (
        <p className="wizard-derived-notice sbp-dormant">
          Choices from level {derived.dormantLevels.join(', ')} are saved but dormant — they come back on level up.
          {canEdit && (
            <button type="button" className="btn-ghost sbp-danger" onClick={discardAbove}>Discard choices above level {draft.level}</button>
          )}
        </p>
      )}
      {derived.pendingChoices.length > 0 && (
        <p className="wizard-warning">
          Still to pick: {derived.pendingChoices.map((p) => `L${p.level} ${p.label}`).join(' · ')}
        </p>
      )}

      <DerivedSummary d={derived} />

      {canEdit && levelSlots.length > 0 && (
        <section className="sbp-level-choices">
          <h2 className="wizard-subheading">Level-by-level choices</h2>
          <p className="sbp-muted">Species, background, class and the level-1 skill picks are changed with Edit build.</p>
          {levelSlots.map(([n, s]) => (
            <div key={n} className="sbp-level-block">
              <h3 className="sbp-level-block__title">Level {n}</h3>
              {s.archetype && klass?.archetype && archGroup && (
                <ArchetypePicker
                  label={klass.archetype.label}
                  options={archGroup.options}
                  chosenId={draft.choices[String(n)]?.archetypeId}
                  onChange={(id) => setDraft((d) => withChoices(d, n, { archetypeId: id }))}
                />
              )}
              {s.asi && (
                <AsiOrFeatPicker
                  level={n}
                  choice={draft.choices[String(n)]?.asiOrFeat}
                  feats={eligibleFeats(
                    rules.origins.feats,
                    draft.speciesId,
                    takenFeatIds,
                    draft.choices[String(n)]?.asiOrFeat?.type === 'feat' ? (draft.choices[String(n)]!.asiOrFeat as FeatChoice).featId : undefined,
                  )}
                  onChange={(next) => setAsi(n, next)}
                />
              )}
              {s.grants.map((g) => (
                <GrantPickPicker
                  key={g.sourceKey}
                  request={g}
                  feats={rules.origins.feats}
                  knownSkills={derived.skills}
                  onChange={(picks) => setGrant(n, g.sourceKey, picks)}
                />
              ))}
            </div>
          ))}
        </section>
      )}
    </SbpPage>
  );
}
