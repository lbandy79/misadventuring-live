/**
 * HunterCreationPage — /shows/monster-of-the-week/create-hunter
 *
 * 8-step wizard for creating a MotW hunter sheet.
 * Gated: must be signed in with a Google account on the cast allowlist.
 *
 * Steps:
 *   0. welcome   — Hunter Briefing cheat sheet
 *   1. playbook  — pick one of 12 playbooks
 *   2. name      — hunter's name
 *   3. ratings   — choose a stat line
 *   4. moves     — select N moves (mandatory pre-checked, locked)
 *   5. gear      — starting equipment reference
 *   6. specials  — per-playbook special mechanics
 *   7. review    — full character sheet → print → save to Firestore
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import {
  createHunterSheet,
  getHunterSheet,
  updateHunterSheet,
} from '../../../src/lib/hunters/hunterApi';
import { Doodle } from '../components/Doodle';

// ─── Types (mirroring system JSON shape) ──────────────────────────────────────

interface RatingLine {
  charm: number;
  cool: number;
  sharp: number;
  tough: number;
  weird: number;
}

interface Move {
  name: string;
  mandatory?: boolean;
  description: string;
}

interface Playbook {
  id: string;
  name: string;
  concept: string;
  examples: string[];
  ratingLines: RatingLine[];
  moveCount: number;
  moves: Move[];
  gear: string[];
  luckSpecial?: string;
  advancedImprovement: string | null;
  specialMechanics: Record<string, PlaybookSpecialMechanic>;
}

interface PlaybookSpecialMechanic {
  description: string;
  options?: string[];
  goodTraditions?: string[];
  badTraditions?: string[];
  pickCount?: number;
  pick?: number;
  howYouFoundOut?: string[];
  heroicTags?: string[];
  doomTags?: string[];
  suggestions?: string[];
  bases?: string[];
  extras?: string[];
  effects?: string[];
  resources?: string[];
  redTape?: string[];
  options2?: string[];
  whoYouLost?: string[];
  whyYouCouldntSave?: string[];
  background?: { options: string[] };
  forms?: string[];
  businessEnd?: string[];
  material?: string[];
  tags?: string[];
}

interface Rating {
  id: string;
  name: string;
  description: string;
}

interface BasicMove {
  id: string;
  name: string;
  roll: string;
  trigger: string;
  results: Record<string, string>;
}

interface MotWSystem {
  playbooks: Playbook[];
  ratings: { list: Rating[]; scale: Record<string, string> };
  dice: { mechanic: { results: Record<string, string> } };
  luck: { boxes: number; spendOptions: string[]; whenEmpty: string };
  harm: { track: number; unstableAt: number };
  basicMoves: BasicMove[];
  improvements: { leveling: string };
}

type WizardStep = 'welcome' | 'playbook' | 'name' | 'ratings' | 'moves' | 'gear' | 'specials' | 'review';

const STEPS: WizardStep[] = ['welcome', 'playbook', 'name', 'ratings', 'moves', 'gear', 'specials', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
  welcome: 'Intro',
  playbook: 'Playbook',
  name: 'Name',
  ratings: 'Ratings',
  moves: 'Moves',
  gear: 'Gear',
  specials: 'Special',
  review: 'Review',
};

const ACCENT = '#1d4e3a';
const ACCENT_INK = '#f5f0e3';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HunterCreationPage() {
  const { user, isLoading, isCast, isCastLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [system, setSystem] = useState<MotWSystem | null>(null);
  const [systemError, setSystemError] = useState(false);
  const [editLoading, setEditLoading] = useState(!!editId);

  const [step, setStep] = useState<WizardStep>('welcome');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [hunterName, setHunterName] = useState('');
  const [ratingLineIndex, setRatingLineIndex] = useState<number | null>(null);
  const [selectedMoveNames, setSelectedMoveNames] = useState<string[]>([]);
  const [specialMechanics, setSpecialMechanics] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const accentStyle = {
    '--accent': ACCENT,
    '--accent-ink': ACCENT_INK,
  } as React.CSSProperties;

  useEffect(() => {
    import('../../../src/systems/monster-of-the-week.system.json')
      .then((mod) => {
        const raw = mod.default ?? mod;
        setSystem(raw as unknown as MotWSystem);
      })
      .catch(() => setSystemError(true));
  }, []);

  // Pre-fill state when editing an existing sheet.
  // Waits for system to load first so playbook lookup is ready when we jump to 'review'.
  useEffect(() => {
    if (!editId || !system) return;
    getHunterSheet(editId)
      .then((sheet) => {
        if (!sheet) return;
        setSelectedPlaybookId(sheet.playbookId);
        setHunterName(sheet.hunterName);
        setRatingLineIndex(sheet.ratingLineIndex);
        setSelectedMoveNames(sheet.selectedMoveIds);
        setSpecialMechanics(sheet.specialMechanics);
        setStep('review');
      })
      .catch((err) => console.error('Failed to load sheet for edit:', err))
      .finally(() => setEditLoading(false));
  }, [editId, system]);

  const playbook = useMemo(
    () => system?.playbooks.find((p) => p.id === selectedPlaybookId) ?? null,
    [system, selectedPlaybookId],
  );

  useEffect(() => {
    if (!playbook) return;
    const mandatory = playbook.moves.filter((m) => m.mandatory).map((m) => m.name);
    setSelectedMoveNames(mandatory);
    setRatingLineIndex(null);
    setSpecialMechanics({});
  }, [playbook?.id]);

  // ── Guard states ──────────────────────────────────────────────────────────────

  if (isLoading || (user && isCastLoading) || editLoading) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <p className="join-loading">{editLoading ? 'Loading your hunter…' : 'Checking your cast status…'}</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <Doodle name="nat20_dice" top="-20px" right="-24px" rotation={12} opacity={0.7} width="90px" />
        <header className="join-header">
          <p className="join-eyebrow">Monster of the Week</p>
          <h1 className="join-title">Create your hunter.</h1>
        </header>
        <p className="join-subtitle">Sign in with your Google account to access character creation.</p>
        <button
          type="button"
          className="btn-primary btn-block"
          onClick={() => signIn().catch(console.error)}
        >
          Sign in with Google
        </button>
      </section>
    );
  }

  if (!isCast) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <header className="join-header">
          <p className="join-eyebrow">Monster of the Week</p>
          <h1 className="join-title">You're not on the cast list.</h1>
        </header>
        <p className="join-subtitle">
          Signed in as <strong>{user.email}</strong>. The GM needs to add your email to the cast list first.
        </p>
        <p className="join-subtitle">
          <Link to="/shows/monster-of-the-week">← Back to show page</Link>
        </p>
      </section>
    );
  }

  if (systemError) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <h1>Something went wrong loading the character data.</h1>
        <Link to="/shows/monster-of-the-week">← Back to show page</Link>
      </section>
    );
  }

  if (!system) {
    return (
      <section className="page-card hunter-page" style={accentStyle}>
        <p className="join-loading">Loading character creation…</p>
      </section>
    );
  }

  // ── Step navigation ───────────────────────────────────────────────────────────

  function goTo(target: WizardStep) {
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) goTo(STEPS[i + 1]);
  }

  function goBack() {
    const i = STEPS.indexOf(step);
    if (i > 0) goTo(STEPS[i - 1]);
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user || !playbook || ratingLineIndex === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editId) {
        await updateHunterSheet(editId, {
          hunterName: hunterName.trim(),
          playbookId: playbook.id,
          playbookName: playbook.name,
          ratingLineIndex,
          selectedMoveIds: selectedMoveNames,
          gear: playbook.gear,
          specialMechanics,
        });
        navigate('/hunters');
      } else {
        const sheet = await createHunterSheet({
          castMemberUid: user.uid,
          castMemberEmail: (user.email ?? '').toLowerCase(),
          castMemberName: user.displayName ?? user.email ?? 'Unknown',
          showId: 'monster-of-the-week',
          systemId: 'monster-of-the-week',
          hunterName: hunterName.trim(),
          playbookId: playbook.id,
          playbookName: playbook.name,
          ratingLineIndex,
          selectedMoveIds: selectedMoveNames,
          gear: playbook.gear,
          specialMechanics,
        });
        navigate(`/hunters?created=${sheet.id}`);
      }
    } catch (err) {
      console.error('Failed to save hunter sheet:', err);
      setSaveError('Save failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Progress dots (exclude welcome step) ─────────────────────────────────────

  const stepIndex = STEPS.indexOf(step);
  const progressSteps = STEPS.slice(1);
  const progressIndex = stepIndex - 1;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <section className="page-card hunter-page" style={accentStyle} data-show="monster-of-the-week">
      <Doodle name="nat20_dice" top="-20px" right="-24px" rotation={12} opacity={0.65} width="88px" />

      <header className="join-header">
        <p className="join-eyebrow">Monster of the Week</p>
        <h1 className="join-title">
          {step === 'welcome'
            ? 'Hunter Briefing.'
            : step === 'review'
            ? 'Ready to hunt?'
            : 'Create your hunter.'}
        </h1>
      </header>

      {step !== 'welcome' && (
        <>
          <div className="hunter-steps" aria-label="Wizard progress">
            {progressSteps.map((s, i) => (
              <button
                key={s}
                type="button"
                className={[
                  'hunter-step-dot',
                  i < progressIndex ? 'hunter-step-dot--done' : '',
                  i === progressIndex ? 'hunter-step-dot--active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => (i < progressIndex ? goTo(s) : undefined)}
                disabled={i > progressIndex}
                aria-label={STEP_LABELS[s]}
                title={STEP_LABELS[s]}
              />
            ))}
          </div>
          <p className="hunter-step-label">{STEP_LABELS[step]}</p>
        </>
      )}

      {step === 'welcome' && (
        <WelcomeStep system={system} onNext={goNext} />
      )}

      {step === 'playbook' && (
        <PlaybookStep
          playbooks={system.playbooks}
          selected={selectedPlaybookId}
          onSelect={setSelectedPlaybookId}
          onNext={() => selectedPlaybookId && goNext()}
        />
      )}

      {step === 'name' && playbook && (
        <NameStep
          playbook={playbook}
          hunterName={hunterName}
          onChange={setHunterName}
          onNext={() => hunterName.trim() && goNext()}
          onBack={goBack}
        />
      )}

      {step === 'ratings' && playbook && (
        <RatingsStep
          playbook={playbook}
          system={system}
          selectedIndex={ratingLineIndex}
          onSelect={setRatingLineIndex}
          onNext={() => ratingLineIndex !== null && goNext()}
          onBack={goBack}
        />
      )}

      {step === 'moves' && playbook && (
        <MovesStep
          playbook={playbook}
          selected={selectedMoveNames}
          onChange={setSelectedMoveNames}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 'gear' && playbook && (
        <GearStep
          playbook={playbook}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 'specials' && playbook && (
        <SpecialsStep
          playbook={playbook}
          values={specialMechanics}
          onChange={setSpecialMechanics}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 'review' && playbook && ratingLineIndex !== null && (
        <ReviewStep
          hunterName={hunterName}
          playbook={playbook}
          ratingLineIndex={ratingLineIndex}
          selectedMoveNames={selectedMoveNames}
          specialMechanics={specialMechanics}
          system={system}
          saving={saving}
          saveError={saveError}
          isEditing={!!editId}
          onSave={handleSave}
          onBack={goBack}
          onEdit={goTo}
        />
      )}
    </section>
  );
}

// ─── Helper footer ────────────────────────────────────────────────────────────

function HelperFooter({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="helper-footer" open>
      <summary className="helper-footer__summary">{title}</summary>
      <div className="helper-footer__body">{children}</div>
    </details>
  );
}

// ─── Step 0: Welcome / Hunter Briefing ───────────────────────────────────────

function WelcomeStep({ system, onNext }: { system: MotWSystem; onNext: () => void }) {
  const results = system.dice.mechanic.results;

  return (
    <div className="hunter-step">
      <p className="join-subtitle">
        Monster of the Week is a game about hunting things that go bump in the night.
        You play <strong>hunters</strong> — ordinary people with extraordinary drive who protect
        the world from monsters, conspiracies, and cosmic horror.
      </p>

      <div className="welcome-grid">
        <div className="welcome-card">
          <h3 className="welcome-card__title">How Dice Work</h3>
          <p className="welcome-card__intro">
            When you do something risky, roll <strong>2d6</strong> and add the relevant rating.
          </p>
          <ul className="welcome-result-list">
            {Object.entries(results).map(([key, value]) => (
              <li key={key} className="welcome-result">
                <span className="welcome-result__range">{key}</span>
                <span className="welcome-result__text">{value as string}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="welcome-card">
          <h3 className="welcome-card__title">Ratings</h3>
          <p className="welcome-card__intro">Scale from −1 (bad) to +3 (phenomenal).</p>
          <ul className="welcome-rating-list">
            {system.ratings.list.map((r) => (
              <li key={r.id} className="welcome-rating-entry">
                <span className="welcome-rating__name">{r.name}</span>
                <span className="welcome-rating__desc">{r.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="welcome-card">
          <h3 className="welcome-card__title">Luck & Harm</h3>
          <div className="welcome-luck-harm">
            <div>
              <span className="welcome-rules-label">Luck</span>
              <p>
                Start with {system.luck.boxes} Luck boxes. Spend one to change any roll
                to a 12, or reduce a wound to 0. When empty, you're doomed.
              </p>
            </div>
            <div>
              <span className="welcome-rules-label">Harm</span>
              <p>
                Track harm on a {system.harm.track}-box scale. At {system.harm.unstableAt}+
                harm you're unstable and worsen without treatment.
              </p>
            </div>
          </div>
        </div>

        <div className="welcome-card">
          <h3 className="welcome-card__title">Experience & Leveling</h3>
          <p>{system.improvements.leveling}</p>
          <p className="welcome-card__small">
            After 5 level-ups, advanced improvements unlock.
          </p>
        </div>
      </div>

      <div className="hunter-step-actions">
        <button type="button" className="btn-primary" onClick={onNext}>
          Build my hunter →
        </button>
      </div>
    </div>
  );
}

// ─── Step 1: Playbook ─────────────────────────────────────────────────────────

function PlaybookStep({
  playbooks,
  selected,
  onSelect,
  onNext,
}: {
  playbooks: Playbook[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  const selectedPlaybook = playbooks.find((p) => p.id === selected) ?? null;

  return (
    <div className="hunter-step">
      <p className="join-subtitle">Who are you as a hunter?</p>
      <div className="playbook-grid">
        {playbooks.map((pb) => (
          <button
            key={pb.id}
            type="button"
            className={[
              'playbook-card',
              selected === pb.id ? 'playbook-card--selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelect(pb.id)}
          >
            <strong className="playbook-card__name">{pb.name}</strong>
            <p className="playbook-card__concept">{pb.concept}</p>
            {pb.examples.length > 0 && (
              <p className="playbook-card__examples">e.g. {pb.examples.join(', ')}</p>
            )}
          </button>
        ))}
      </div>

      {selectedPlaybook && (
        <div className="playbook-detail">
          <h3 className="playbook-detail__name">{selectedPlaybook.name}</h3>
          <p className="playbook-detail__concept">{selectedPlaybook.concept}</p>
          {selectedPlaybook.examples.length > 0 && (
            <p className="playbook-detail__examples">
              Examples: {selectedPlaybook.examples.join(', ')}
            </p>
          )}
          {selectedPlaybook.luckSpecial && (
            <p className="playbook-detail__luck">
              <strong>Luck special:</strong> {selectedPlaybook.luckSpecial}
            </p>
          )}
          {selectedPlaybook.advancedImprovement && (
            <p className="playbook-detail__adv">
              <strong>Advanced improvement:</strong> {selectedPlaybook.advancedImprovement}
            </p>
          )}
        </div>
      )}

      <div className="hunter-step-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={onNext}
          disabled={!selected}
        >
          Choose this playbook →
        </button>
      </div>

      <HelperFooter title="What's a playbook?">
        <p>
          A playbook is your hunter archetype — it shapes your stats, moves, and special
          abilities. Each tells a different kind of story. Pick the one that speaks to the
          character you want to play.
        </p>
        <p>You can scroll back to change your choice at any point before saving.</p>
      </HelperFooter>
    </div>
  );
}

// ─── Step 2: Name ─────────────────────────────────────────────────────────────

function NameStep({
  playbook,
  hunterName,
  onChange,
  onNext,
  onBack,
}: {
  playbook: Playbook;
  hunterName: string;
  onChange: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="hunter-step">
      <p className="join-subtitle">
        You're playing <strong>{playbook.name}</strong>. What's your hunter's name?
      </p>
      <div className="join-name-field">
        <label className="join-name-field__label" htmlFor="hunter-name">
          Hunter's name
        </label>
        <input
          id="hunter-name"
          type="text"
          className="join-name-field__input"
          value={hunterName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a name…"
          maxLength={80}
          autoComplete="off"
          autoFocus
        />
      </div>
      <div className="hunter-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button
          type="button"
          className="btn-primary"
          onClick={onNext}
          disabled={!hunterName.trim()}
        >
          Next →
        </button>
      </div>

      <HelperFooter title="Naming your hunter">
        <p>
          Your hunter's name is what the other cast members will call you in play. Go for
          something that fits the world — gritty, grounded, or a little weird.
        </p>
        <p>
          This is your character's name, not yours. First name only is totally fine.
        </p>
      </HelperFooter>
    </div>
  );
}

// ─── Step 3: Ratings ──────────────────────────────────────────────────────────

const RATING_KEYS = ['charm', 'cool', 'sharp', 'tough', 'weird'] as const;

function RatingsStep({
  playbook,
  system,
  selectedIndex,
  onSelect,
  onNext,
  onBack,
}: {
  playbook: Playbook;
  system: MotWSystem;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="hunter-step">
      <p className="join-subtitle">Pick your stat line for <strong>{playbook.name}</strong>.</p>
      <div className="ratings-grid">
        <div className="ratings-header">
          <div className="ratings-header__label" />
          {RATING_KEYS.map((k) => (
            <div key={k} className="ratings-header__stat">
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </div>
          ))}
        </div>
        {playbook.ratingLines.map((line, i) => (
          <button
            key={i}
            type="button"
            className={[
              'ratings-row',
              selectedIndex === i ? 'ratings-row--selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelect(i)}
          >
            <div className="ratings-row__pick">{selectedIndex === i ? '✓' : '○'}</div>
            {RATING_KEYS.map((k) => {
              const val = line[k];
              return (
                <div
                  key={k}
                  className={[
                    'ratings-row__val',
                    val > 0 ? 'ratings-row__val--pos' : val < 0 ? 'ratings-row__val--neg' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {val > 0 ? `+${val}` : val}
                </div>
              );
            })}
          </button>
        ))}
      </div>
      <div className="hunter-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button
          type="button"
          className="btn-primary"
          onClick={onNext}
          disabled={selectedIndex === null}
        >
          Next →
        </button>
      </div>

      <HelperFooter title="Understanding ratings">
        <ul className="helper-rating-list">
          {system.ratings.list.map((r) => (
            <li key={r.id} className="helper-rating-entry">
              <strong>{r.name}:</strong> {r.description}
            </li>
          ))}
        </ul>
        <p className="helper-footer__note">
          Higher isn't always better — specialization defines your hunter's flavor.
          Each stat line tells a different story about who your hunter is.
        </p>
      </HelperFooter>
    </div>
  );
}

// ─── Step 4: Moves ────────────────────────────────────────────────────────────

function MovesStep({
  playbook,
  selected,
  onChange,
  onNext,
  onBack,
}: {
  playbook: Playbook;
  selected: string[];
  onChange: (names: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const mandatory = playbook.moves.filter((m) => m.mandatory).map((m) => m.name);
  const total = playbook.moveCount;
  const remaining = total - selected.length;

  function toggle(moveName: string) {
    if (mandatory.includes(moveName)) return;
    if (selected.includes(moveName)) {
      onChange(selected.filter((n) => n !== moveName));
    } else if (selected.length < total) {
      onChange([...selected, moveName]);
    }
  }

  return (
    <div className="hunter-step">
      <p className="join-subtitle">
        Choose <strong>{total}</strong> moves for <strong>{playbook.name}</strong>.{' '}
        {remaining > 0 ? (
          <span>Pick {remaining} more.</span>
        ) : (
          <span className="moves-done">You're done.</span>
        )}
      </p>
      <ul className="moves-list">
        {playbook.moves.map((move) => {
          const isMandatory = move.mandatory === true;
          const isSelected = selected.includes(move.name);
          const isDisabled = !isMandatory && !isSelected && selected.length >= total;
          return (
            <li
              key={move.name}
              className={[
                'move-item',
                isSelected ? 'move-item--selected' : '',
                isMandatory ? 'move-item--mandatory' : '',
                isDisabled ? 'move-item--disabled' : '',
              ].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className="move-item__toggle"
                onClick={() => toggle(move.name)}
                disabled={isMandatory || isDisabled}
                aria-pressed={isSelected}
              >
                <span className="move-item__check">{isSelected ? '✓' : '○'}</span>
                <span className="move-item__name">
                  {move.name}
                  {isMandatory && (
                    <span className="move-item__mandatory-tag"> (mandatory)</span>
                  )}
                </span>
              </button>
              <p className="move-item__desc">{move.description}</p>
            </li>
          );
        })}
      </ul>
      <div className="hunter-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button
          type="button"
          className="btn-primary"
          onClick={onNext}
          disabled={selected.length < total}
        >
          Next →
        </button>
      </div>

      <HelperFooter title="How moves work">
        <p>
          Moves are the structured things your hunter can do. When your action triggers
          a move, roll 2d6 and add the listed stat to find out what happens.
        </p>
        <p>
          <strong>Mandatory moves</strong> come pre-selected — they're core to your
          playbook and can't be removed. Your optional picks customize what you're good at.
        </p>
        <p className="helper-footer__note">
          Read each description carefully. They shape what your hunter can do in play.
        </p>
      </HelperFooter>
    </div>
  );
}

// ─── Step 5: Gear ─────────────────────────────────────────────────────────────

function GearStep({
  playbook,
  onNext,
  onBack,
}: {
  playbook: Playbook;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="hunter-step">
      <p className="join-subtitle">Starting gear for <strong>{playbook.name}</strong>.</p>
      <ul className="gear-list">
        {playbook.gear.map((item, i) => (
          <li key={i} className="gear-item">{item}</li>
        ))}
      </ul>
      <div className="hunter-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button type="button" className="btn-primary" onClick={onNext}>
          Got it →
        </button>
      </div>

      <HelperFooter title="About your gear">
        <p>
          This is your starting equipment. In play, the right tool for the right monster
          can make the difference between surviving and not.
        </p>
        <p>
          The Keeper may swap or refine options during Zero Session.
          This is a reference, not a contract.
        </p>
      </HelperFooter>
    </div>
  );
}

// ─── Step 6: Special Mechanics ────────────────────────────────────────────────

function SpecialsStep({
  playbook,
  values,
  onChange,
  onNext,
  onBack,
}: {
  playbook: Playbook;
  values: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const mechanicKeys = Object.keys(playbook.specialMechanics ?? {});

  if (mechanicKeys.length === 0) {
    return (
      <div className="hunter-step">
        <p className="join-subtitle">
          <strong>{playbook.name}</strong> has no special creation choices — you're all set.
        </p>
        <div className="hunter-step-actions">
          <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
          <button type="button" className="btn-primary" onClick={onNext}>Next →</button>
        </div>
      </div>
    );
  }

  function update(key: string, val: unknown) {
    onChange({ ...values, [key]: val });
  }

  return (
    <div className="hunter-step">
      <p className="join-subtitle">Special choices for <strong>{playbook.name}</strong>.</p>

      {mechanicKeys.map((key) => {
        const mechanic = playbook.specialMechanics[key];
        const current = values[key];
        return (
          <SpecialMechanicBlock
            key={key}
            mechanicKey={key}
            mechanic={mechanic}
            value={current}
            onChange={(val) => update(key, val)}
          />
        );
      })}

      <div className="hunter-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button type="button" className="btn-primary" onClick={onNext}>Next →</button>
      </div>

      <HelperFooter title="Special mechanics">
        <p>
          These are the things that make your playbook unique beyond moves and gear —
          your Sect, your dark side, your doom. They define your hunter's story in ways
          no other playbook has.
        </p>
        <p>
          If you're unsure about a choice, ask the GM. Some of these come up constantly
          in play; others are mostly character flavor.
        </p>
      </HelperFooter>
    </div>
  );
}

// ─── Special Mechanic block (per-mechanic renderer) ───────────────────────────

function SpecialMechanicBlock({
  mechanicKey,
  mechanic,
  value,
  onChange,
}: {
  mechanicKey: string;
  mechanic: PlaybookSpecialMechanic;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const label = mechanicKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

  const singleOptions = mechanic.options ?? mechanic.suggestions;
  if (singleOptions && !mechanic.pick && !mechanic.goodTraditions && !mechanic.bases) {
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <div className="special-block__options">
          {singleOptions.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                value === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name={mechanicKey}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
          <FreeTextField
            label="Or describe your own:"
            value={typeof value === 'string' && !singleOptions.includes(value) ? value : ''}
            onChange={onChange}
          />
        </div>
      </fieldset>
    );
  }

  if (mechanic.tags && mechanic.pick) {
    return (
      <TagPickerBlock
        mechanicKey={mechanicKey}
        label={label}
        desc={mechanic.description}
        tags={mechanic.tags}
        pickCount={mechanic.pick}
        value={(value as string[]) ?? []}
        onChange={onChange}
      />
    );
  }

  if (mechanic.goodTraditions && mechanic.badTraditions) {
    const v = (value as { good?: string[]; bad?: string[] }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-good`}
          label="Good traditions (pick 2)"
          desc=""
          tags={mechanic.goodTraditions}
          pickCount={2}
          value={v.good ?? []}
          onChange={(good) => onChange({ ...v, good })}
        />
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-bad`}
          label="Bad tradition (pick 1)"
          desc=""
          tags={mechanic.badTraditions}
          pickCount={1}
          value={v.bad ?? []}
          onChange={(bad) => onChange({ ...v, bad })}
        />
      </fieldset>
    );
  }

  if (mechanic.resources && mechanic.redTape) {
    const v = (value as { resources?: string[]; redTape?: string[] }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-res`}
          label="Resources (pick 2)"
          desc=""
          tags={mechanic.resources}
          pickCount={2}
          value={v.resources ?? []}
          onChange={(resources) => onChange({ ...v, resources })}
        />
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-red`}
          label="Red tape (pick 2)"
          desc=""
          tags={mechanic.redTape}
          pickCount={2}
          value={v.redTape ?? []}
          onChange={(redTape) => onChange({ ...v, redTape })}
        />
      </fieldset>
    );
  }

  if (mechanic.pickCount && mechanic.options) {
    return (
      <TagPickerBlock
        mechanicKey={mechanicKey}
        label={label}
        desc={mechanic.description}
        tags={mechanic.options}
        pickCount={mechanic.pickCount}
        value={(value as string[]) ?? []}
        onChange={onChange}
      />
    );
  }

  if (mechanic.bases && mechanic.effects) {
    const v = (value as { bases?: string[]; effects?: string[] }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <p className="special-block__hint">
          Pick at least 1 base, then combine with effects to reach 3 total options.
        </p>
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-bases`}
          label="Bases"
          desc=""
          tags={mechanic.bases}
          pickCount={3}
          value={v.bases ?? []}
          onChange={(bases) => onChange({ ...v, bases })}
        />
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-effects`}
          label="Effects"
          desc=""
          tags={mechanic.effects}
          pickCount={3}
          value={v.effects ?? []}
          onChange={(effects) => onChange({ ...v, effects })}
        />
      </fieldset>
    );
  }

  if (mechanic.options && mechanicKey === 'toolsAndTechniques') {
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <p className="special-block__hint">Cross one off — you've eliminated that requirement.</p>
        <div className="special-block__options">
          {mechanic.options.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                value === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name={mechanicKey}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="special-block__radio"
              />
              <span style={value === opt ? { textDecoration: 'line-through' } : {}}>{opt}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (mechanic.bases && mechanic.extras) {
    const v = (value as { base?: string; extras?: string[] }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <div className="special-block__options">
          <p className="special-block__sublabel">Base</p>
          {mechanic.bases.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                v.base === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name={`${mechanicKey}-base`}
                value={opt}
                checked={v.base === opt}
                onChange={() => onChange({ ...v, base: opt })}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
        </div>
        <TagPickerBlock
          mechanicKey={`${mechanicKey}-extras`}
          label="Extras (optional)"
          desc=""
          tags={mechanic.extras}
          pickCount={mechanic.extras.length}
          value={v.extras ?? []}
          onChange={(extras) => onChange({ ...v, extras })}
        />
      </fieldset>
    );
  }

  if (mechanic.howYouFoundOut && mechanic.heroicTags && mechanic.doomTags) {
    const v = (value as { howYouFoundOut?: string; heroicTags?: string[]; doomTags?: string[] }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <div className="special-block__options">
          <p className="special-block__sublabel">How you found out</p>
          {mechanic.howYouFoundOut.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                v.howYouFoundOut === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name="howYouFoundOut"
                value={opt}
                checked={v.howYouFoundOut === opt}
                onChange={() => onChange({ ...v, howYouFoundOut: opt })}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
        </div>
        <TagPickerBlock
          mechanicKey="heroicTags"
          label="Heroic tags (pick 2)"
          desc=""
          tags={mechanic.heroicTags}
          pickCount={2}
          value={v.heroicTags ?? []}
          onChange={(heroicTags) => onChange({ ...v, heroicTags })}
        />
        <TagPickerBlock
          mechanicKey="doomTags"
          label="Doom tags (pick 2)"
          desc=""
          tags={mechanic.doomTags}
          pickCount={2}
          value={v.doomTags ?? []}
          onChange={(doomTags) => onChange({ ...v, doomTags })}
        />
      </fieldset>
    );
  }

  if (mechanic.forms && mechanic.businessEnd && mechanic.material) {
    const v = (value as { form?: string; businessEnd?: string[]; material?: string }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <div className="special-block__options">
          <p className="special-block__sublabel">Form</p>
          {mechanic.forms.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                v.form === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name="specialWeaponForm"
                value={opt}
                checked={v.form === opt}
                onChange={() => onChange({ ...v, form: opt })}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
        </div>
        <TagPickerBlock
          mechanicKey="specialWeaponBE"
          label="Business end (pick 3)"
          desc=""
          tags={mechanic.businessEnd}
          pickCount={3}
          value={v.businessEnd ?? []}
          onChange={(businessEnd) => onChange({ ...v, businessEnd })}
        />
        <div className="special-block__options">
          <p className="special-block__sublabel">Material</p>
          {mechanic.material.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                v.material === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name="specialWeaponMaterial"
                value={opt}
                checked={v.material === opt}
                onChange={() => onChange({ ...v, material: opt })}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (mechanic.whoYouLost && mechanic.whyYouCouldntSave) {
    const v = (value as { who?: string; why?: string; prey?: string }) ?? {};
    return (
      <fieldset className="special-block">
        <legend className="special-block__title">{label}</legend>
        <p className="special-block__desc">{mechanic.description}</p>
        <div className="special-block__options">
          <p className="special-block__sublabel">Who you lost</p>
          {mechanic.whoYouLost.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                v.who === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name="whoYouLost"
                value={opt}
                checked={v.who === opt}
                onChange={() => onChange({ ...v, who: opt })}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
        </div>
        <div className="special-block__options">
          <p className="special-block__sublabel">Why you couldn't save them</p>
          {mechanic.whyYouCouldntSave.map((opt) => (
            <label
              key={opt}
              className={[
                'special-block__option',
                v.why === opt ? 'special-block__option--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name="whyCouldntSave"
                value={opt}
                checked={v.why === opt}
                onChange={() => onChange({ ...v, why: opt })}
                className="special-block__radio"
              />
              {opt}
            </label>
          ))}
        </div>
        <FreeTextField
          label="Prey (describe the monster breed with your Keeper):"
          value={v.prey ?? ''}
          onChange={(prey) => onChange({ ...v, prey })}
        />
      </fieldset>
    );
  }

  return (
    <fieldset className="special-block">
      <legend className="special-block__title">{label}</legend>
      <p className="special-block__desc">{mechanic.description}</p>
      <FreeTextField
        label="Notes:"
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
      />
    </fieldset>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function TagPickerBlock({
  mechanicKey: _mechanicKey,
  label,
  desc,
  tags,
  pickCount,
  value,
  onChange,
}: {
  mechanicKey: string;
  label: string;
  desc: string;
  tags: string[];
  pickCount: number;
  value: string[];
  onChange: (val: string[]) => void;
}) {
  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else if (value.length < pickCount) {
      onChange([...value, tag]);
    }
  }

  return (
    <fieldset className="special-block special-block--nested">
      {label && (
        <legend className="special-block__sublabel">
          {label} ({value.length}/{pickCount})
        </legend>
      )}
      {desc && <p className="special-block__desc">{desc}</p>}
      <div className="special-block__tags">
        {tags.map((tag) => {
          const selected = value.includes(tag);
          const disabled = !selected && value.length >= pickCount;
          return (
            <button
              key={tag}
              type="button"
              className={[
                'tag-chip',
                selected ? 'tag-chip--selected' : '',
                disabled ? 'tag-chip--disabled' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => toggle(tag)}
              disabled={disabled}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FreeTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="special-block__free">
      {label && <label className="special-block__sublabel">{label}</label>}
      <textarea
        className="special-block__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={500}
      />
    </div>
  );
}

// ─── Track sub-components ─────────────────────────────────────────────────────

function LuckTrack({ boxes }: { boxes: number }) {
  return (
    <div className="motw-luck-track">
      {Array.from({ length: boxes }, (_, i) => (
        <span key={i} className="motw-luck-box" />
      ))}
    </div>
  );
}

function HarmTrack({ track, unstableAt }: { track: number; unstableAt: number }) {
  return (
    <div className="motw-harm-track">
      {Array.from({ length: track }, (_, i) => (
        <span
          key={i}
          className={['motw-harm-box', i >= unstableAt - 1 ? 'unstable' : ''].filter(Boolean).join(' ')}
        />
      ))}
      <span className="motw-harm-dead">✝</span>
    </div>
  );
}

// ─── Special Mechanics Readout (read-only, for review sheet) ──────────────────

function SpecialMechanicsReadout({ mechanics }: { mechanics: Record<string, unknown> }) {
  return (
    <dl className="specials-display">
      {Object.entries(mechanics).map(([key, val]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        return (
          <div key={key} className="specials-display__row">
            <dt className="specials-display__key">{label}</dt>
            <dd className="specials-display__val">
              {Array.isArray(val)
                ? val.join(', ')
                : typeof val === 'object' && val !== null
                ? <SpecialMechanicsReadout mechanics={val as Record<string, unknown>} />
                : String(val)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// ─── Step 7: Review — full character sheet ────────────────────────────────────

const RATING_DISPLAY = ['Charm', 'Cool', 'Sharp', 'Tough', 'Weird'];

function ReviewStep({
  hunterName,
  playbook,
  ratingLineIndex,
  selectedMoveNames,
  specialMechanics,
  system,
  saving,
  saveError,
  isEditing,
  onSave,
  onBack,
  onEdit,
}: {
  hunterName: string;
  playbook: Playbook;
  ratingLineIndex: number;
  selectedMoveNames: string[];
  specialMechanics: Record<string, unknown>;
  system: MotWSystem;
  saving: boolean;
  saveError: string | null;
  isEditing: boolean;
  onSave: () => void;
  onBack: () => void;
  onEdit: (step: WizardStep) => void;
}) {
  const line = playbook.ratingLines[ratingLineIndex] as unknown as Record<string, number>;
  const selectedMoves = playbook.moves.filter((m) => selectedMoveNames.includes(m.name));

  return (
    <div className="hunter-step">
      <div className="motw-sheet">

        {/* ── Sheet header ── */}
        <div className="motw-sheet__header">
          <div>
            <h2 className="motw-sheet__name">{hunterName || 'Unnamed Hunter'}</h2>
            <p className="motw-sheet__playbook">{playbook.name}</p>
          </div>
          <button
            type="button"
            className="motw-sheet__print-btn btn-ghost"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="motw-sheet-grid">

          {/* ── Ratings ── */}
          <div className="motw-sheet-section">
            <div className="motw-sheet-section-head">
              <h3 className="motw-sheet-section-title">Ratings</h3>
              <button
                type="button"
                className="motw-jump-btn"
                onClick={() => onEdit('ratings')}
              >
                Edit
              </button>
            </div>
            <div className="motw-sheet-ratings">
              {RATING_KEYS.map((k, i) => {
                const val = line[k];
                return (
                  <div
                    key={k}
                    className={[
                      'motw-sheet-stat',
                      val >= 2 ? 'high' : val <= -1 ? 'low' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="motw-sheet-stat-name">{RATING_DISPLAY[i]}</span>
                    <span className="motw-sheet-stat-val">
                      {val >= 0 ? `+${val}` : val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Luck ── */}
          <div className="motw-sheet-section">
            <h3 className="motw-sheet-section-title">Luck</h3>
            <LuckTrack boxes={system.luck.boxes} />
            {playbook.luckSpecial && (
              <p className="motw-sheet-luck-special">{playbook.luckSpecial}</p>
            )}
          </div>

          {/* ── Harm ── */}
          <div className="motw-sheet-section">
            <h3 className="motw-sheet-section-title">Harm</h3>
            <HarmTrack track={system.harm.track} unstableAt={system.harm.unstableAt} />
            <p className="motw-sheet-harm-note">Unstable at {system.harm.unstableAt}+</p>
          </div>

          {/* ── Experience ── */}
          <div className="motw-sheet-section motw-sheet-wide">
            <h3 className="motw-sheet-section-title">Experience</h3>
            <div className="motw-xp-track">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="motw-xp-box" />
              ))}
            </div>
            <p className="motw-sheet-harm-note">
              Mark on a miss (6−) or when a move says to. 5 marks = level up.
            </p>
          </div>

          {/* ── Moves ── */}
          <div className="motw-sheet-section motw-sheet-wide">
            <div className="motw-sheet-section-head">
              <h3 className="motw-sheet-section-title">Moves</h3>
              <button
                type="button"
                className="motw-jump-btn"
                onClick={() => onEdit('moves')}
              >
                Edit
              </button>
            </div>
            <div className="motw-sheet-moves">
              {selectedMoves.map((move) => (
                <div
                  key={move.name}
                  className={['motw-sheet-move', move.mandatory ? 'mandatory' : ''].filter(Boolean).join(' ')}
                >
                  <div className="motw-sheet-move-name">
                    {move.name}
                    {move.mandatory && (
                      <span className="motw-mandatory-badge">Always</span>
                    )}
                  </div>
                  <p className="motw-sheet-move-desc">{move.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Gear ── */}
          <div className="motw-sheet-section">
            <h3 className="motw-sheet-section-title">Gear</h3>
            <ul className="motw-sheet-gear">
              {playbook.gear.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </div>

          {/* ── Special Mechanics ── */}
          {Object.keys(specialMechanics).length > 0 && (
            <div className="motw-sheet-section motw-sheet-wide">
              <div className="motw-sheet-section-head">
                <h3 className="motw-sheet-section-title">Special Mechanics</h3>
                <button
                  type="button"
                  className="motw-jump-btn"
                  onClick={() => onEdit('specials')}
                >
                  Edit
                </button>
              </div>
              <SpecialMechanicsReadout mechanics={specialMechanics} />
            </div>
          )}

        </div>

        {/* ── Basic Moves Quick Reference ── */}
        <div className="motw-reference-section">
          <h3 className="motw-sheet-section-title">Basic Moves Quick Reference</h3>
          <div className="motw-basic-moves-grid">
            {system.basicMoves.map((move) => (
              <div key={move.id} className="motw-basic-move-card">
                <div className="motw-basic-move-head">
                  <span className="motw-basic-move-name">{move.name}</span>
                  <span className="motw-basic-move-roll">+{move.roll}</span>
                </div>
                <p className="motw-basic-move-trigger">{move.trigger}</p>
                <ul className="motw-basic-move-results">
                  {Object.entries(move.results).map(([key, val]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {val}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>

      {saveError && (
        <p className="npc-admin-panel__error" role="alert">{saveError}</p>
      )}

      <div className="hunter-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={saving}>
          ← Back
        </button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : isEditing ? 'Update my hunter →' : 'Save my hunter →'}
        </button>
      </div>
    </div>
  );
}
