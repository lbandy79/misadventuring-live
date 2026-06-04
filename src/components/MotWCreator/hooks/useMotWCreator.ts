import { useReducer, useMemo } from 'react';
import type { MotWCreatorState, MotWStep, MotWSystemConfig } from '../../../types/motw.types';
import { MOTW_STEP_ORDER } from '../../../types/motw.types';

type Action =
  | { type: 'SET_PLAYBOOK'; payload: string }
  | { type: 'SET_RATINGS_LINE'; payload: number }
  | { type: 'TOGGLE_MOVE'; payload: string }
  | { type: 'SET_SPECIAL_NOTES'; payload: string }
  | { type: 'SET_HUNTER_NAME'; payload: string }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_STEP'; payload: MotWStep }
  | { type: 'RESET' };

const INITIAL_STATE: MotWCreatorState = {
  step: 'welcome',
  playbookId: null,
  ratingsLineIndex: null,
  selectedMoveNames: [],
  specialNotes: '',
  hunterName: '',
  playerName: '',
};

function reducer(state: MotWCreatorState, action: Action): MotWCreatorState {
  switch (action.type) {
    case 'SET_PLAYBOOK':
      return {
        ...INITIAL_STATE,
        step: state.step,
        playbookId: action.payload,
      };
    case 'SET_RATINGS_LINE':
      return { ...state, ratingsLineIndex: action.payload };
    case 'TOGGLE_MOVE': {
      const name = action.payload;
      const already = state.selectedMoveNames.includes(name);
      return {
        ...state,
        selectedMoveNames: already
          ? state.selectedMoveNames.filter((n) => n !== name)
          : [...state.selectedMoveNames, name],
      };
    }
    case 'SET_SPECIAL_NOTES':
      return { ...state, specialNotes: action.payload };
    case 'SET_HUNTER_NAME':
      return { ...state, hunterName: action.payload };
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };
    case 'NEXT_STEP': {
      const idx = MOTW_STEP_ORDER.indexOf(state.step);
      const next = MOTW_STEP_ORDER[idx + 1];
      return next ? { ...state, step: next } : state;
    }
    case 'PREV_STEP': {
      const idx = MOTW_STEP_ORDER.indexOf(state.step);
      const prev = MOTW_STEP_ORDER[idx - 1];
      return prev ? { ...state, step: prev } : state;
    }
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'RESET':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

export function useMotWCreator(config: MotWSystemConfig) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const selectedPlaybook = useMemo(
    () => config.playbooks.find((p) => p.id === state.playbookId) ?? null,
    [config.playbooks, state.playbookId]
  );

  const mandatoryMoves = useMemo(
    () => selectedPlaybook?.moves.filter((m) => m.mandatory) ?? [],
    [selectedPlaybook]
  );

  const optionalMoves = useMemo(
    () => selectedPlaybook?.moves.filter((m) => !m.mandatory) ?? [],
    [selectedPlaybook]
  );

  const optionalMoveLimit = selectedPlaybook?.moveCount ?? 0;

  const optionalSelectedCount = useMemo(
    () =>
      state.selectedMoveNames.filter((name) =>
        optionalMoves.some((m) => m.name === name)
      ).length,
    [state.selectedMoveNames, optionalMoves]
  );

  const canAddMove = optionalSelectedCount < optionalMoveLimit;

  const selectedRatings = useMemo(() => {
    if (!selectedPlaybook || state.ratingsLineIndex === null) return null;
    return selectedPlaybook.ratingLines[state.ratingsLineIndex] ?? null;
  }, [selectedPlaybook, state.ratingsLineIndex]);

  const hasSpecialMechanics = Boolean(
    selectedPlaybook?.specialMechanics &&
      Object.keys(selectedPlaybook.specialMechanics).length > 0
  );

  return {
    state,
    dispatch,
    selectedPlaybook,
    mandatoryMoves,
    optionalMoves,
    optionalMoveLimit,
    optionalSelectedCount,
    canAddMove,
    selectedRatings,
    hasSpecialMechanics,
  };
}
