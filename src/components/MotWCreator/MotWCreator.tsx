import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { isMotWConfig, type MotWSystemConfig } from '../../types/motw.types';
import MotWProgressBar from './components/MotWProgressBar';
import WelcomeStep from './steps/WelcomeStep';
import PlaybookStep from './steps/PlaybookStep';
import RatingsStep from './steps/RatingsStep';
import MovesStep from './steps/MovesStep';
import SpecialStep from './steps/SpecialStep';
import SummaryStep from './steps/SummaryStep';
import { useMotWCreator } from './hooks/useMotWCreator';
import './MotWCreator.css';

const stepVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function MotWCreator() {
  const { config, loading, error } = useSystemConfig();

  if (loading) return <div className="motw-creator-wrap"><p className="motw-loading">Loading case files…</p></div>;
  if (error) return <div className="motw-creator-wrap"><p className="motw-error">{error}</p></div>;
  if (!isMotWConfig(config)) {
    return <div className="motw-creator-wrap"><p className="motw-error">Loaded system is not Monster of the Week.</p></div>;
  }

  return <MotWCreatorInner config={config} />;
}

function MotWCreatorInner({ config }: { config: MotWSystemConfig }) {
  const [stepError, setStepError] = useState('');
  const creator = useMotWCreator(config);
  const {
    state,
    dispatch,
    selectedPlaybook,
    mandatoryMoves,
    optionalMoves,
    optionalMoveLimit,
    optionalSelectedCount,
    canAddMove,
    selectedRatings,
  } = creator;

  const canAdvance = useMemo(() => {
    switch (state.step) {
      case 'welcome':
        return true;
      case 'playbook':
        return Boolean(state.playbookId);
      case 'ratings':
        return state.ratingsLineIndex !== null;
      case 'moves':
        return optionalSelectedCount === optionalMoveLimit;
      case 'specials':
        return Boolean(state.hunterName.trim());
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [state, optionalSelectedCount, optionalMoveLimit]);

  const goNext = () => {
    if (!canAdvance) {
      const messages: Partial<Record<typeof state.step, string>> = {
        playbook: 'Choose a playbook to continue.',
        ratings: 'Pick a ratings line to continue.',
        moves: `Select ${optionalMoveLimit} move${optionalMoveLimit !== 1 ? 's' : ''} to continue.`,
        specials: "Enter your hunter's name to continue.",
      };
      setStepError(messages[state.step] ?? 'Complete this step to continue.');
      return;
    }
    setStepError('');
    dispatch({ type: 'NEXT_STEP' });
  };

  const goBack = () => {
    setStepError('');
    dispatch({ type: 'PREV_STEP' });
  };

  const renderStep = () => {
    switch (state.step) {
      case 'welcome':
        return <WelcomeStep config={config} />;

      case 'playbook':
        return (
          <PlaybookStep
            playbooks={config.playbooks}
            selectedId={state.playbookId}
            onSelect={(id) => dispatch({ type: 'SET_PLAYBOOK', payload: id })}
          />
        );

      case 'ratings':
        if (!selectedPlaybook) return null;
        return (
          <RatingsStep
            playbook={selectedPlaybook}
            ratings={config.ratings.list}
            selectedIndex={state.ratingsLineIndex}
            onSelect={(i) => dispatch({ type: 'SET_RATINGS_LINE', payload: i })}
          />
        );

      case 'moves':
        if (!selectedPlaybook) return null;
        return (
          <MovesStep
            playbook={selectedPlaybook}
            mandatoryMoves={mandatoryMoves}
            optionalMoves={optionalMoves}
            optionalMoveLimit={optionalMoveLimit}
            optionalSelectedCount={optionalSelectedCount}
            selectedMoveNames={state.selectedMoveNames}
            canAddMove={canAddMove}
            onToggle={(name) => dispatch({ type: 'TOGGLE_MOVE', payload: name })}
          />
        );

      case 'specials':
        if (!selectedPlaybook) return null;
        return (
          <SpecialStep
            playbook={selectedPlaybook}
            specialNotes={state.specialNotes}
            onNotesChange={(notes) => dispatch({ type: 'SET_SPECIAL_NOTES', payload: notes })}
            hunterName={state.hunterName}
            playerName={state.playerName}
            onHunterNameChange={(name) => dispatch({ type: 'SET_HUNTER_NAME', payload: name })}
            onPlayerNameChange={(name) => dispatch({ type: 'SET_PLAYER_NAME', payload: name })}
          />
        );

      case 'summary':
        if (!selectedPlaybook || !selectedRatings) return null;
        return (
          <SummaryStep
            state={state}
            playbook={selectedPlaybook}
            selectedRatings={selectedRatings}
            mandatoryMoves={mandatoryMoves}
            config={config}
            onJumpToStep={(step) => dispatch({ type: 'SET_STEP', payload: step })}
            onReset={() => dispatch({ type: 'RESET' })}
            onBack={() => dispatch({ type: 'PREV_STEP' })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="motw-creator-wrap">
      <div className={`motw-creator-card${state.step === 'summary' ? ' motw-summary-card' : ''}`}>
        <div className="motw-creator-header">
          <h1 className="motw-creator-title">Monster of the Week</h1>
          <p className="motw-creator-tagline">Hunter Creation</p>
        </div>

        {state.step !== 'welcome' && (
          <MotWProgressBar currentStep={state.step} />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {stepError ? <p className="motw-step-error">{stepError}</p> : null}

        {state.step !== 'summary' && (
          <div className="motw-nav">
            <button
              type="button"
              className="motw-btn-secondary"
              onClick={goBack}
              disabled={state.step === 'welcome'}
            >
              Back
            </button>
            <button
              type="button"
              className={`motw-btn-primary${!canAdvance ? ' motw-btn-blocked' : ''}`}
              onClick={goNext}
            >
              {state.step === 'specials' ? 'View Sheet' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
