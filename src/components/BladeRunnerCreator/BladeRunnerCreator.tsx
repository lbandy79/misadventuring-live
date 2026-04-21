import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { isBladeRunnerConfig, type BladeRunnerSystemConfig } from '../../types/bladeRunner.types';
import HowToPlayPanel from './components/HowToPlayPanel';
import ProgressBar from './components/ProgressBar';
import NatureStep from './steps/NatureStep';
import ArchetypeStep from './steps/ArchetypeStep';
import YearsStep from './steps/YearsStep';
import AttributesStep from './steps/AttributesStep';
import SkillsStep from './steps/SkillsStep';
import SpecialtiesStep from './steps/SpecialtiesStep';
import KeyMemoryStep from './steps/KeyMemoryStep';
import KeyRelationshipStep from './steps/KeyRelationshipStep';
import FinishingTouchesStep from './steps/FinishingTouchesStep';
import SummaryStep from './steps/SummaryStep';
import {
  findByRollRange,
  matchRollOption,
  useCharacterCreation,
  type BladeRunnerStep,
} from './hooks/useCharacterCreation';
import './BladeRunnerCreator.css';

const stepVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const STEP_LABELS: Record<BladeRunnerStep, string> = {
  nature: 'Nature',
  archetype: 'Archetype',
  years: 'Years',
  attributes: 'Attributes',
  skills: 'Skills',
  specialties: 'Specialties',
  keyMemory: 'Key Memory',
  keyRelationship: 'Key Relationship',
  finishing: 'Finishing Touches',
  summary: 'Summary',
};

export default function BladeRunnerCreator() {
  const { config, loading, error } = useSystemConfig();

  if (loading) return <div className="br-creator-wrap"><p>Loading Blade Runner system...</p></div>;
  if (error) return <div className="br-creator-wrap"><p>{error}</p></div>;
  if (!isBladeRunnerConfig(config)) {
    return <div className="br-creator-wrap"><p>Loaded system is not Blade Runner RPG.</p></div>;
  }

  return <BladeRunnerCreatorInner config={config} />;
}

function BladeRunnerCreatorInner({ config }: { config: BladeRunnerSystemConfig }) {
  const [showHelp, setShowHelp] = useState(false);
  const [stepError, setStepError] = useState('');

  const creation = useCharacterCreation(config);
  const currentStep = creation.state.step;

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 'nature':
        return Boolean(creation.state.natureId);
      case 'archetype':
        return Boolean(creation.state.archetypeId);
      case 'years':
        return Boolean(creation.state.yearsOnForceId);
      case 'attributes':
        return (
          creation.attributeValidation.oneDropMax &&
          creation.attributeValidation.exactBudget &&
          creation.attributeValidation.replicantRestriction &&
          creation.attributeValidation.keyAttributeMeetsMinimum
        );
      case 'skills':
        return creation.skillValidation.exactBudget;
      case 'specialties':
        return creation.state.specialties.length <= creation.specialtyLimit;
      case 'keyMemory': {
        const values = creation.state.keyMemory;
        return Boolean(values.when && values.where && values.who && values.what && values.feeling);
      }
      case 'keyRelationship': {
        const values = creation.state.keyRelationship;
        return Boolean(values.name && values.who && values.quality && values.situation);
      }
      case 'finishing': {
        const values = creation.state.finishing;
        return Boolean(values.playerName && values.name && values.signatureItem && values.home);
      }
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [creation, currentStep]);

  const goNext = () => {
    if (!canAdvance) {
      setStepError('Please complete this step before continuing.');
      return;
    }
    setStepError('');
    creation.dispatch({ type: 'NEXT_STEP' });
  };

  const goBack = () => {
    setStepError('');
    creation.dispatch({ type: 'PREV_STEP' });
  };

  const onNatureRoll = (rolled: number) => {
    const match = findByRollRange(config.nature.options, rolled);
    if (match) creation.dispatch({ type: 'SET_NATURE', payload: match.id });
  };

  const onArchetypeRoll = (rolled: number) => {
    if (!creation.availableArchetypes.length) return;
    const selected = creation.availableArchetypes[(rolled - 1) % creation.availableArchetypes.length];
    creation.dispatch({ type: 'SET_ARCHETYPE', payload: selected.id });
  };

  const onYearsRoll = (rolled: number) => {
    const match = findByRollRange(config.yearsOnForce, rolled);
    if (match) creation.dispatch({ type: 'SET_YEARS', payload: match.id });
  };

  const handleMemoryRoll = (field: 'when' | 'where' | 'who' | 'what' | 'feeling', rolled: number) => {
    const table = config.keyMemory.tables[field];
    const match = matchRollOption(table.options, rolled);
    if (match) creation.dispatch({ type: 'SET_KEY_MEMORY', payload: { [field]: match.text } });
  };

  const handleRelationshipRoll = (field: 'who' | 'quality' | 'situation', rolled: number) => {
    const table = config.keyRelationship.tables[field];
    const match = matchRollOption(table.options, rolled);
    if (match) creation.dispatch({ type: 'SET_KEY_RELATIONSHIP', payload: { [field]: match.text } });
  };

  const onSignatureRoll = (rolled: number) => {
    const match = matchRollOption(config.signatureItem.options, rolled);
    if (match) creation.dispatch({ type: 'SET_FINISHING', payload: { signatureItem: match.text } });
  };

  const onHomeRoll = (rolled: number) => {
    const match = matchRollOption(config.homes.options, rolled);
    if (match) creation.dispatch({ type: 'SET_FINISHING', payload: { home: match.text } });
  };

  const character = creation.buildCharacter();

  const renderStep = () => {
    switch (currentStep) {
      case 'nature':
        return (
          <NatureStep
            natures={config.nature.options}
            selectedNatureId={creation.state.natureId}
            onSelect={(natureId) => creation.dispatch({ type: 'SET_NATURE', payload: natureId })}
            onRoll={onNatureRoll}
          />
        );
      case 'archetype':
        return (
          <ArchetypeStep
            archetypes={creation.availableArchetypes}
            selectedArchetypeId={creation.state.archetypeId}
            onSelect={(id) => creation.dispatch({ type: 'SET_ARCHETYPE', payload: id })}
            onRoll={onArchetypeRoll}
          />
        );
      case 'years':
        return (
          <YearsStep
            years={config.yearsOnForce}
            selectedYearsId={creation.state.yearsOnForceId}
            isReplicant={creation.state.natureId === 'replicant'}
            onSelect={(id) => creation.dispatch({ type: 'SET_YEARS', payload: id })}
            onRoll={onYearsRoll}
          />
        );
      case 'attributes':
        return (
          <AttributesStep
            attributes={config.attributes}
            values={creation.state.attributes}
            selectedArchetype={creation.selectedArchetype}
            selectedNatureId={creation.state.natureId}
            onChange={(id, level) => creation.dispatch({ type: 'SET_ATTRIBUTE', payload: { id, level } })}
            budget={creation.attributeBudget}
            spent={creation.attributeSpent}
            health={creation.health}
            resolve={creation.resolve}
            validation={creation.attributeValidation}
          />
        );
      case 'skills':
        return (
          <SkillsStep
            skills={config.skills}
            values={creation.state.skills}
            selectedArchetype={creation.selectedArchetype}
            onChange={(id, level) => creation.dispatch({ type: 'SET_SKILL', payload: { id, level } })}
            budget={creation.skillBudget}
            spent={creation.skillSpent}
          />
        );
      case 'specialties':
        return (
          <SpecialtiesStep
            specialties={config.specialties}
            selected={creation.state.specialties}
            selectedById={creation.specialtiesById}
            limit={creation.specialtyLimit}
            selectedArchetype={creation.selectedArchetype}
            canAdd={creation.canAddSpecialty}
            onChange={(next) => creation.dispatch({ type: 'SET_SPECIALTIES', payload: next })}
          />
        );
      case 'keyMemory':
        return (
          <KeyMemoryStep
            tables={config.keyMemory.tables}
            values={creation.state.keyMemory}
            onChange={(field, value) => creation.dispatch({ type: 'SET_KEY_MEMORY', payload: { [field]: value } })}
            onRoll={handleMemoryRoll}
          />
        );
      case 'keyRelationship':
        return (
          <KeyRelationshipStep
            tables={config.keyRelationship.tables}
            values={creation.state.keyRelationship}
            onChange={(field, value) => creation.dispatch({ type: 'SET_KEY_RELATIONSHIP', payload: { [field]: value } })}
            onRoll={handleRelationshipRoll}
          />
        );
      case 'finishing':
        return (
          <FinishingTouchesStep
            name={creation.state.finishing.name}
            playerName={creation.state.finishing.playerName}
            appearance={creation.state.finishing.appearance}
            signatureItem={creation.state.finishing.signatureItem}
            home={creation.state.finishing.home}
            standardGear={config.standardGear}
            signatureOptions={config.signatureItem.options}
            homeOptions={config.homes.options}
            signatureDie={config.signatureItem.rollDie}
            homeDie={config.homes.rollDie}
            selectedArchetype={creation.selectedArchetype}
            onChange={(field, value) => creation.dispatch({ type: 'SET_FINISHING', payload: { [field]: value } })}
            onRollSignature={onSignatureRoll}
            onRollHome={onHomeRoll}
          />
        );
      case 'summary':
        return (
          <SummaryStep
            character={character}
            config={config}
            onJumpToStep={(step) => creation.dispatch({ type: 'SET_STEP', payload: step })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="br-creator-wrap">
      <div className="br-creator-card">
        <h1>Blade Runner Character Builder</h1>
        <ProgressBar currentStep={currentStep} steps={creation.stepOrder} labels={STEP_LABELS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {stepError ? <p className="br-error">{stepError}</p> : null}

        <div className="br-nav">
          <button type="button" onClick={goBack} disabled={currentStep === 'nature'}>Back</button>
          {currentStep === 'summary' ? (
            <button
              type="button"
              className="br-primary"
              onClick={() =>
                creation.dispatch({
                  type: 'RESET',
                  payload: { skillIds: config.skills.map((skill) => skill.id) },
                })
              }
            >
              Start Over
            </button>
          ) : (
            <button type="button" className="br-primary" onClick={goNext}>Next</button>
          )}
        </div>
      </div>

      <HowToPlayPanel config={config} open={showHelp} onToggle={() => setShowHelp((value) => !value)} />
    </div>
  );
}
