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
}

export const BYSTANDER_TYPES: Record<BystanderTypeId, BystanderTypeInfo> = {
  busybody: { label: 'Busybody', tagline: 'interferes in other people\'s plans' },
  detective: { label: 'Detective', tagline: 'rules out explanations' },
  gossip:    { label: 'Gossip',    tagline: 'passes on rumours' },
  helper:    { label: 'Helper',    tagline: 'joins the hunt' },
  innocent:  { label: 'Innocent',  tagline: 'does the right thing' },
  official:  { label: 'Official',  tagline: 'gets suspicious' },
  skeptic:   { label: 'Skeptic',   tagline: 'denies the supernatural' },
  victim:    { label: 'Victim',    tagline: 'puts themselves in danger' },
  witness:   { label: 'Witness',   tagline: 'reveals information' },
};

export const BYSTANDER_TYPE_IDS = Object.keys(BYSTANDER_TYPES) as BystanderTypeId[];
