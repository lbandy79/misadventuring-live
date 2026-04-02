/**
 * NPC Types — System-Driven Character Creation
 * 
 * Firestore document shape for audience-submitted NPCs.
 * Field names match npcCreator.fields[].id in the system JSON.
 */

export interface NPC {
  id: string;
  reservationId: string;
  showId: string;
  systemId: string;

  // Character data — field IDs match system JSON npcCreator.fields
  name: string;
  occupation: string;
  appearance: string;
  secret: string;
  bestStat: string;   // stat ID from system JSON (e.g., "charm")
  worstStat: string;  // stat ID from system JSON (e.g., "brawn")

  // Metadata
  createdAt: number;

  // GM fields
  gmNotes: string;
  gmFlagged: boolean;
}
