export interface MonsterSlotOption {
  text: string;
  emoji: string;
  /** MotW monster type ids this pick suggests — aggregated by the GM output panel. */
  typeHints?: string[];
}

export interface MonsterSlotConfig {
  id: string;
  /** Question shown to audience: "What does it look like?" */
  label: string;
  /** Prefix shown on the display card: "It appears as..." */
  revealPrefix: string;
  /** Exactly 4–6 preset options. */
  options: MonsterSlotOption[];
  allowWriteIn: boolean;
}

export interface BystanderMovePreset {
  /** Short audience-facing label: "Try to help" */
  label: string;
  /** Full MotW move text stored and displayed by GM/screen. */
  text: string;
}

export interface BystanderConfig {
  /** Intro line shown at the top of the audience form. */
  openPrompt: string;
  /** 2–4 preset moves the audience can pick from (or write a custom one). */
  movePresets: BystanderMovePreset[];
}

export interface MonsterBuilderConfig {
  showId: string;
  showName: string;
  slots: MonsterSlotConfig[];
  bystander: BystanderConfig;
}
