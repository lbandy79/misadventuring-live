import type { LoadedSbpRules, SbpCharacter, SbpClassesFile, SbpOriginsFile } from '@mtp/lib';

/** Rules docs are guaranteed present once the wizard renders its steps. */
export interface WizardRules {
  classes: SbpClassesFile;
  origins: SbpOriginsFile;
  loaded: LoadedSbpRules;
}

/** The character under construction. Ids are '' until chosen. */
export type Draft = SbpCharacter;

export interface StepProps {
  draft: Draft;
  rules: WizardRules;
  onChange: (next: Draft) => void;
}
