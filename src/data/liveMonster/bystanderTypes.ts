export type BystanderTypeId =
  | 'busybody'
  | 'detective'
  | 'gossip'
  | 'helper'
  | 'innocent'
  | 'official'
  | 'skeptic'
  | 'victim'
  | 'witness';

export interface BystanderTypeInfo {
  label: string;
  tagline: string;
  emoji: string;
}

export const BYSTANDER_TYPES: Record<BystanderTypeId, BystanderTypeInfo> = {
  busybody: { label: 'Busybody',  tagline: 'interferes in other people\'s plans', emoji: '👀' },
  detective: { label: 'Detective', tagline: 'rules out explanations',              emoji: '🔍' },
  gossip:    { label: 'Gossip',    tagline: 'passes on rumours',                   emoji: '💬' },
  helper:    { label: 'Helper',    tagline: 'joins the hunt',                      emoji: '🤝' },
  innocent:  { label: 'Innocent',  tagline: 'does the right thing',                emoji: '😇' },
  official:  { label: 'Official',  tagline: 'gets suspicious',                     emoji: '🛡️' },
  skeptic:   { label: 'Skeptic',   tagline: 'denies the supernatural',             emoji: '🤨' },
  victim:    { label: 'Victim',    tagline: 'puts themselves in danger',            emoji: '😱' },
  witness:   { label: 'Witness',   tagline: 'reveals information',                 emoji: '👁️' },
};

export const BYSTANDER_TYPE_IDS = Object.keys(BYSTANDER_TYPES) as BystanderTypeId[];
