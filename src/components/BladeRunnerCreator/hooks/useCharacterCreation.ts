import { useMemo, useReducer } from 'react';
import type {
  AttributeLevel,
  BladeRunnerArchetype,
  BladeRunnerAttribute,
  BladeRunnerCharacter,
  BladeRunnerNatureOption,
  BladeRunnerSystemConfig,
  BladeRunnerYearsOnForce,
} from '../../../types/bladeRunner.types';

export type BladeRunnerStep =
  | 'nature'
  | 'archetype'
  | 'years'
  | 'attributes'
  | 'skills'
  | 'specialties'
  | 'keyMemory'
  | 'keyRelationship'
  | 'finishing'
  | 'summary';

const STEP_ORDER: BladeRunnerStep[] = [
  'nature',
  'archetype',
  'years',
  'attributes',
  'skills',
  'specialties',
  'keyMemory',
  'keyRelationship',
  'finishing',
  'summary',
];

type AttributeId = BladeRunnerAttribute['id'];

interface CreationState {
  step: BladeRunnerStep;
  natureId: 'human' | 'replicant' | null;
  archetypeId: string | null;
  yearsOnForceId: string | null;
  attributes: Record<AttributeId, AttributeLevel>;
  skills: Record<string, AttributeLevel>;
  specialties: string[];
  keyMemory: {
    when: string;
    where: string;
    who: string;
    what: string;
    feeling: string;
  };
  keyRelationship: {
    name: string;
    who: string;
    quality: string;
    situation: string;
  };
  finishing: {
    name: string;
    appearance: string;
    signatureItem: string;
    home: string;
    playerName: string;
  };
}

type CreationAction =
  | { type: 'SET_STEP'; payload: BladeRunnerStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_NATURE'; payload: 'human' | 'replicant' }
  | { type: 'SET_ARCHETYPE'; payload: string }
  | { type: 'SET_YEARS'; payload: string }
  | { type: 'SET_ATTRIBUTE'; payload: { id: AttributeId; level: AttributeLevel } }
  | { type: 'SET_SKILL'; payload: { id: string; level: AttributeLevel } }
  | { type: 'SET_SPECIALTIES'; payload: string[] }
  | { type: 'SET_KEY_MEMORY'; payload: Partial<CreationState['keyMemory']> }
  | { type: 'SET_KEY_RELATIONSHIP'; payload: Partial<CreationState['keyRelationship']> }
  | { type: 'SET_FINISHING'; payload: Partial<CreationState['finishing']> }
  | { type: 'RESET'; payload: { skillIds: string[] } };

export const ATTRIBUTE_BASELINE: Record<AttributeId, AttributeLevel> = {
  strength: 'C',
  agility: 'C',
  intelligence: 'C',
  empathy: 'C',
};

function createInitialState(skillIds: string[]): CreationState {
  const skills: Record<string, AttributeLevel> = {};
  skillIds.forEach((skillId) => {
    skills[skillId] = 'D';
  });

  return {
    step: 'nature',
    natureId: null,
    archetypeId: null,
    yearsOnForceId: null,
    attributes: { ...ATTRIBUTE_BASELINE },
    skills,
    specialties: [],
    keyMemory: {
      when: '',
      where: '',
      who: '',
      what: '',
      feeling: '',
    },
    keyRelationship: {
      name: '',
      who: '',
      quality: '',
      situation: '',
    },
    finishing: {
      name: '',
      appearance: '',
      signatureItem: '',
      home: '',
      playerName: '',
    },
  };
}

function reducer(state: CreationState, action: CreationAction): CreationState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'NEXT_STEP': {
      const index = STEP_ORDER.indexOf(state.step);
      return { ...state, step: STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)] };
    }
    case 'PREV_STEP': {
      const index = STEP_ORDER.indexOf(state.step);
      return { ...state, step: STEP_ORDER[Math.max(index - 1, 0)] };
    }
    case 'SET_NATURE':
      return {
        ...state,
        natureId: action.payload,
        archetypeId: null,
        yearsOnForceId: action.payload === 'replicant' ? 'rookie' : state.yearsOnForceId,
      };
    case 'SET_ARCHETYPE':
      return { ...state, archetypeId: action.payload };
    case 'SET_YEARS':
      return { ...state, yearsOnForceId: action.payload };
    case 'SET_ATTRIBUTE':
      return {
        ...state,
        attributes: {
          ...state.attributes,
          [action.payload.id]: action.payload.level,
        },
      };
    case 'SET_SKILL':
      return {
        ...state,
        skills: {
          ...state.skills,
          [action.payload.id]: action.payload.level,
        },
      };
    case 'SET_SPECIALTIES':
      return { ...state, specialties: action.payload };
    case 'SET_KEY_MEMORY':
      return { ...state, keyMemory: { ...state.keyMemory, ...action.payload } };
    case 'SET_KEY_RELATIONSHIP':
      return { ...state, keyRelationship: { ...state.keyRelationship, ...action.payload } };
    case 'SET_FINISHING':
      return { ...state, finishing: { ...state.finishing, ...action.payload } };
    case 'RESET':
      return createInitialState(action.payload.skillIds);
    default:
      return state;
  }
}

const ATTRIBUTE_INCREASE_VALUE: Record<AttributeLevel, number> = {
  D: 0,
  C: 0,
  B: 1,
  A: 2,
};

const SKILL_INCREASE_VALUE: Record<AttributeLevel, number> = {
  D: 0,
  C: 1,
  B: 2,
  A: 3,
};

export function useCharacterCreation(config: BladeRunnerSystemConfig) {
  const [state, dispatch] = useReducer(reducer, createInitialState(config.skills.map((skill) => skill.id)));

  const selectedNature = useMemo(
    () => config.nature.options.find((nature) => nature.id === state.natureId) ?? null,
    [config.nature.options, state.natureId]
  );

  const availableArchetypes = useMemo(
    () =>
      state.natureId
        ? config.archetypes.filter((archetype) => archetype.allowedNatures.includes(state.natureId as 'human' | 'replicant'))
        : config.archetypes,
    [config.archetypes, state.natureId]
  );

  const selectedArchetype = useMemo(
    () => config.archetypes.find((archetype) => archetype.id === state.archetypeId) ?? null,
    [config.archetypes, state.archetypeId]
  );

  const selectedYears = useMemo(
    () => config.yearsOnForce.find((years) => years.id === state.yearsOnForceId) ?? null,
    [config.yearsOnForce, state.yearsOnForceId]
  );

  const attributeBudget = useMemo(() => {
    if (!selectedYears) return 0;
    const natureBonus = selectedNature?.bonusAttributeIncreases ?? 0;
    const hasDropTrade = Object.values(state.attributes).filter((level) => level === 'D').length === 1;
    return selectedYears.attributeIncreases + natureBonus + (hasDropTrade ? 1 : 0);
  }, [selectedYears, selectedNature, state.attributes]);

  const attributeSpent = useMemo(
    () => Object.values(state.attributes).reduce((total, level) => total + ATTRIBUTE_INCREASE_VALUE[level], 0),
    [state.attributes]
  );

  const skillBudget = selectedYears?.skillIncreases ?? 0;

  const skillSpent = useMemo(
    () => Object.values(state.skills).reduce((total, level) => total + SKILL_INCREASE_VALUE[level], 0),
    [state.skills]
  );

  const dropCount = useMemo(
    () => Object.values(state.attributes).filter((level) => level === 'D').length,
    [state.attributes]
  );

  const strAglSpent = useMemo(
    () => ATTRIBUTE_INCREASE_VALUE[state.attributes.strength] + ATTRIBUTE_INCREASE_VALUE[state.attributes.agility],
    [state.attributes]
  );

  const keyAttributeMeetsMinimum = useMemo(() => {
    if (!selectedArchetype) return false;
    const keyLevel = state.attributes[selectedArchetype.keyAttribute];
    return keyLevel === 'A' || keyLevel === 'B';
  }, [selectedArchetype, state.attributes]);

  const attributeValidation = {
    withinBudget: attributeSpent <= attributeBudget,
    exactBudget: attributeSpent === attributeBudget,
    oneDropMax: dropCount <= 1,
    replicantRestriction:
      !selectedNature ||
      selectedNature.id !== 'replicant' ||
      (selectedNature.bonusAttributeIncreases ?? 0) === 0 ||
      // The bonus point must land in STR/AGL. Enforce by requiring STR+AGL spent >=
      // the bonus itself PLUS any drop-to-D trade that the user hasn't applied to STR/AGL.
      // Practical rule: Replicants must have strAglSpent >= bonusAttributeIncreases AND
      // must not drop STR or AGL to D (since the bonus is restricted to those attrs).
      (strAglSpent >= (selectedNature.bonusAttributeIncreases ?? 0) &&
        state.attributes.strength !== 'D' &&
        state.attributes.agility !== 'D'),
    keyAttributeMeetsMinimum,
  };

  const skillValidation = {
    withinBudget: skillSpent <= skillBudget,
    exactBudget: skillSpent === skillBudget,
  };

  const dieSizeByLevel = useMemo(
    () =>
      config.attributeLevels.reduce<Record<AttributeLevel, number>>((acc, levelInfo) => {
        acc[levelInfo.level] = levelInfo.dieSize;
        return acc;
      }, { A: 12, B: 10, C: 8, D: 6 }),
    [config.attributeLevels]
  );

  const health = useMemo(() => {
    const size = dieSizeByLevel[state.attributes.strength] + dieSizeByLevel[state.attributes.agility];
    const base = Math.ceil(size / 4);
    const modifier = selectedNature?.healthModifier ?? 0;
    return Math.max(1, base + modifier);
  }, [dieSizeByLevel, selectedNature, state.attributes.agility, state.attributes.strength]);

  const resolve = useMemo(() => {
    const size = dieSizeByLevel[state.attributes.intelligence] + dieSizeByLevel[state.attributes.empathy];
    const base = Math.ceil(size / 4);
    const modifier = selectedNature?.resolveModifier ?? 0;
    return Math.max(1, base + modifier);
  }, [dieSizeByLevel, selectedNature, state.attributes.empathy, state.attributes.intelligence]);

  const specialtyLimit = selectedYears?.specialties ?? 0;

  const specialtiesById = useMemo(
    () => config.specialties.reduce<Record<string, number>>((acc, specialty) => {
      acc[specialty.id] = state.specialties.filter((selected) => selected === specialty.id).length;
      return acc;
    }, {}),
    [config.specialties, state.specialties]
  );

  const canAddSpecialty = (specialtyId: string) => {
    if (state.specialties.length >= specialtyLimit) return false;
    const specialty = config.specialties.find((item) => item.id === specialtyId);
    if (!specialty) return false;
    const selectedCount = specialtiesById[specialtyId] ?? 0;
    const maxStack = typeof specialty.stackable === 'number' ? specialty.stackable : 1;
    return selectedCount < maxStack;
  };

  const buildCharacter = (): BladeRunnerCharacter | null => {
    if (!state.natureId || !state.archetypeId || !state.yearsOnForceId) return null;
    const memorySummary = composeMemorySummary(state.keyMemory);
    const relationshipSummary = composeRelationshipSummary(state.keyRelationship);

    return {
      name: state.finishing.name,
      playerName: state.finishing.playerName,
      appearance: state.finishing.appearance,
      natureId: state.natureId,
      archetypeId: state.archetypeId,
      yearsOnForceId: state.yearsOnForceId,
      attributes: state.attributes,
      health,
      resolve,
      skills: state.skills,
      specialties: state.specialties,
      keyMemory: {
        ...state.keyMemory,
        summary: memorySummary,
      },
      keyRelationship: {
        ...state.keyRelationship,
        summary: relationshipSummary,
      },
      signatureItem: state.finishing.signatureItem,
      home: state.finishing.home,
      gear: config.standardGear,
    };
  };

  return {
    state,
    dispatch,
    stepOrder: STEP_ORDER,
    selectedNature,
    selectedArchetype,
    selectedYears,
    availableArchetypes,
    attributeBudget,
    attributeSpent,
    skillBudget,
    skillSpent,
    health,
    resolve,
    specialtyLimit,
    specialtiesById,
    canAddSpecialty,
    attributeValidation,
    skillValidation,
    buildCharacter,
  };
}

export function matchRollOption<T extends { roll: number | [number, number] }>(options: T[], value: number): T | null {
  for (const option of options) {
    if (typeof option.roll === 'number' && option.roll === value) return option;
    if (Array.isArray(option.roll) && value >= option.roll[0] && value <= option.roll[1]) return option;
  }
  return null;
}

export function findByRollRange<T extends { rollRange: [number, number] }>(items: T[], value: number): T | null {
  for (const item of items) {
    if (value >= item.rollRange[0] && value <= item.rollRange[1]) return item;
  }
  return null;
}

export function rollDie(dieType: string): number {
  const max = Number.parseInt(dieType.toLowerCase().replace('d', ''), 10);
  if (!Number.isFinite(max) || max < 1) return 1;
  return Math.floor(Math.random() * max) + 1;
}

export function composeMemorySummary(values: {
  when: string;
  where: string;
  who: string;
  what: string;
  feeling: string;
}): string {
  const parts = [
    values.when,
    values.where,
    values.who,
    values.what,
    values.feeling ? `You felt ${values.feeling.toLowerCase()}.` : '',
  ].filter(Boolean);
  return parts.join(' ');
}

export function composeRelationshipSummary(values: {
  name: string;
  who: string;
  quality: string;
  situation: string;
}): string {
  if (!values.name && !values.who) return '';
  const subject = values.name || 'They';
  const role = values.who ? ` is your ${values.who.toLowerCase()}` : '';
  const quality = values.quality ? `. Your relationship is ${values.quality.toLowerCase()}` : '';
  const situation = values.situation ? `. Right now: ${values.situation}` : '';
  return `${subject}${role}${quality}${situation}`.trim();
}

export type {
  BladeRunnerArchetype,
  BladeRunnerNatureOption,
  BladeRunnerYearsOnForce,
};
