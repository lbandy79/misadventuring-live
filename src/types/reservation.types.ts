/**
 * Reservation Types — Ticket Code Auth Flow
 * 
 * Firestore document shape for show reservations.
 * Each reservation gets a unique access code that unlocks the NPC Creator.
 */

export interface Reservation {
  id: string;
  name: string;
  email: string;
  accessCode: string;   // 6-char alphanumeric, auto-generated
  createdAt: number;
  npcCreated: boolean;   // flips true when they complete NPC form
  showId: string;        // matches showConfig.showId in system JSON
}
