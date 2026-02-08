/**
 * Villager/NPC Types - Beast of Ridgefall Sprint
 * 
 * Types for audience-submitted villagers with items.
 * Some items are "hoard items" that affect the story.
 */

// Species options for NPCs
export type VillagerSpecies = 
  | 'Human' 
  | 'Dwarf' 
  | 'Elf' 
  | 'Halfling' 
  | 'Half-Orc' 
  | 'Gnome' 
  | 'Tiefling'
  | 'Dragonborn';

// Background options
export type VillagerBackground = 
  | 'Trapper'
  | 'Merchant'
  | 'Traveler'
  | 'Farmer'
  | 'Blacksmith'
  | 'Herbalist'
  | 'Hunter'
  | 'Miller'
  | 'Innkeeper'
  | 'Shepherd';

// Pronouns options
export type VillagerPronouns = 'he' | 'she' | 'they';

// Item with hoard flag
export interface VillagerItem {
  id: string;
  name: string;
  emoji: string;
  isHoardItem: boolean;
  description?: string;
}

// Villager moderation status
export type VillagerStatus = 'approved' | 'hidden';

// A submitted villager
export interface Villager {
  id?: string; // Firebase doc ID
  name: string;
  pronouns: VillagerPronouns; // NEW: Pronouns field
  species: VillagerSpecies;
  background: VillagerBackground;
  quirk: string;
  item: string; // Item ID
  itemName: string; // Item display name
  isHoardItem: boolean;
  submittedAt: number;
  submittedBy?: string; // Anonymous user ID
  featured?: boolean; // GM can highlight
  status: VillagerStatus; // Moderation status (auto-approved, GM can hide)
}

// Firebase state for villager submission
export interface VillagerSubmissionState {
  status: 'collecting' | 'closed' | 'displaying';
  maxSubmissions?: number;
  submissions: Villager[];
  featuredIds: string[];
  sessionId: string;
}

// Active interaction type for villager submission
export interface VillagerSubmissionInteraction {
  type: 'villager-submit';
  status: 'collecting' | 'closed' | 'displaying';
  sessionId: string;
}

// All available items - Beast of Ridgefall (categorized for reference, flat list in dropdown)
export const VILLAGER_ITEMS: VillagerItem[] = [
  // Sound-based items (counter Wolf Head)
  { id: 'brass-bell', name: 'Brass Bell', emoji: '🔔', isHoardItem: false, description: 'Loud enough to wake the dead' },
  { id: 'shepherds-whistle', name: "Shepherd's Whistle", emoji: '📯', isHoardItem: false, description: 'Piercing and shrill' },
  { id: 'thunderstone', name: 'Thunderstone', emoji: '💥', isHoardItem: true, description: 'Creates a deafening boom when thrown' },
  { id: 'drum', name: 'Drum', emoji: '🥁', isHoardItem: false, description: 'Beats that echo through the hills' },
  
  // Light-based items (counter Owl Head)
  { id: 'lantern', name: 'Lantern', emoji: '🏮', isHoardItem: false },
  { id: 'polished-mirror', name: 'Polished Mirror', emoji: '🪞', isHoardItem: false, description: 'Reflects light brilliantly' },
  { id: 'sunrod', name: 'Sunrod', emoji: '✨', isHoardItem: true, description: 'Glows with magical daylight' },
  { id: 'spotlight-candle', name: 'Spotlight Candle', emoji: '🕯️', isHoardItem: false, description: 'Burns with focused intensity' },
  
  // Water/Cold items (counter Flame Body, Squid Arms)
  { id: 'bucket-of-water', name: 'Bucket of Water', emoji: '🪣', isHoardItem: false },
  { id: 'frost-potion', name: 'Frost Potion', emoji: '❄️', isHoardItem: true, description: 'Freezes on contact' },
  { id: 'ice-block', name: 'Ice Block', emoji: '🧊', isHoardItem: false, description: 'Stays frozen unnaturally long' },
  { id: 'cold-iron-horseshoe', name: 'Cold Iron Horseshoe', emoji: '🧲', isHoardItem: false, description: 'Warded against fey and flame' },
  
  // Fire items (counter Crab Arms, Spider Legs)
  { id: 'torch', name: 'Torch', emoji: '🔥', isHoardItem: false },
  { id: 'fire-oil-flask', name: 'Fire Oil Flask', emoji: '🛢️', isHoardItem: false, description: 'Highly flammable' },
  { id: 'heated-blade', name: 'Heated Blade', emoji: '🗡️', isHoardItem: true, description: 'The metal glows red-hot' },
  { id: 'burning-brand', name: 'Burning Brand', emoji: '🪵', isHoardItem: false, description: 'A smoldering log from the hearth' },
  
  // Traps/Tools (counter Bear Body, Boar Body, Wolf Legs, Stone Body)
  { id: 'leg-trap', name: 'Leg Trap', emoji: '🪤', isHoardItem: false, description: 'Rusty but effective' },
  { id: 'caltrops', name: 'Caltrops', emoji: '📍', isHoardItem: false, description: 'Scatter to slow pursuers' },
  { id: 'net', name: 'Net', emoji: '🥅', isHoardItem: false },
  { id: 'pickaxe', name: 'Pickaxe', emoji: '⛏️', isHoardItem: false },
  { id: 'spear', name: 'Spear', emoji: '🔱', isHoardItem: false, description: 'Good reach, solid point' },
  { id: 'club', name: 'Club', emoji: '🔨', isHoardItem: false, description: 'Simple but effective' },
  
  // Psychological (counter Octopus Head, Ram Head, Gorilla Arms)
  { id: 'skull-totem', name: 'Skull Totem', emoji: '💀', isHoardItem: true, description: 'Ward against evil spirits' },
  { id: 'red-cape', name: 'Red Cape', emoji: '🔴', isHoardItem: false, description: 'Bright and attention-grabbing' },
  { id: 'challenge-glove', name: 'Challenge Glove', emoji: '🧤', isHoardItem: false, description: 'Throw it to issue a challenge' },
  { id: 'decoy-scarecrow', name: 'Decoy Scarecrow', emoji: '🧸', isHoardItem: false, description: 'Distracts and confuses' },
];

// Species options for dropdown
export const SPECIES_OPTIONS: VillagerSpecies[] = [
  'Human',
  'Dwarf', 
  'Elf',
  'Halfling',
  'Half-Orc',
  'Gnome',
  'Tiefling',
  'Dragonborn',
];

// Background options for dropdown
export const BACKGROUND_OPTIONS: VillagerBackground[] = [
  'Trapper',
  'Merchant',
  'Traveler',
  'Farmer',
  'Blacksmith',
  'Herbalist',
  'Hunter',
  'Miller',
  'Innkeeper',
  'Shepherd',
];

// Pronouns options for dropdown
export const PRONOUNS_OPTIONS: { id: VillagerPronouns; label: string }[] = [
  { id: 'he', label: 'He/Him' },
  { id: 'she', label: 'She/Her' },
  { id: 'they', label: 'They/Them' },
];

// Helper to get item by ID
export function getItemById(id: string): VillagerItem | undefined {
  return VILLAGER_ITEMS.find(item => item.id === id);
}

// Helper to get hoard items only
export function getHoardItems(): VillagerItem[] {
  return VILLAGER_ITEMS.filter(item => item.isHoardItem);
}
