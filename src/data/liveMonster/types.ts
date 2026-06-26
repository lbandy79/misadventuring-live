export interface MonsterSlotOption {
  text: string;
  /** Used in the admin panel and audience phone — small, functional. */
  emoji: string;
  /** MotW monster type ids this pick suggests — aggregated by the GM output panel. */
  typeHints?: string[];

  /**
   * DISPLAY ICONS — optional art shown on the projector when this option wins a slot.
   * Both fields are optional; omitting them falls back to text-only with no broken image.
   *
   * gameIcon — "author/slug" from game-icons.net (open license).
   *   Browse: https://game-icons.net
   *   The display builds the URL as:
   *     https://game-icons.net/icons/cc4444/transparent/1x1/{author}/{slug}.svg
   *   Renders as a monochromatic SVG tinted in the show's red — stark, horror-appropriate.
   *   Best for: monster slot reveal cards.
   *
   * fluentEmoji — asset folder name from Microsoft's open-source Fluent Emoji 3D set.
   *   Browse: https://github.com/microsoft/fluentui-emoji/tree/main/assets
   *   The folder name is the exact value here (e.g. "Drop of Blood", "Spider").
   *   Renders as a full-colour illustrated 3D PNG via jsDelivr CDN.
   *   Best for: bystander cards — warmer feel than game-icons.
   *
   * Both are wired in LiveMonsterDisplayPage → SlotIcon component.
   * The slot reveal cards currently prefer gameIcon; bystander cards prefer fluentEmoji.
   * To swap preference, change the `prefer` prop on <SlotIcon>.
   */
  gameIcon?: string;    // e.g. "lorc/skull"
  fluentEmoji?: string; // e.g. "Skull"
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
  /**
   * If true, the audience can still vote on this slot but the winning answer is
   * never shown on the projector display — it appears only in the GM admin panel.
   *
   * USE CASE: The "weakness" slot in MotW. Players must discover it during play;
   * revealing it on the big screen would spoil the mystery. The GM sees it so
   * they know what to work toward, but the hunters have to earn the knowledge.
   *
   * HOW TO USE: Add `secret: true` to any MonsterSlotConfig entry in your show
   * config. LiveMonsterDisplayPage filters these out of SlotStack and MonsterStrip
   * automatically — no other changes needed.
   */
  secret?: boolean;
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
