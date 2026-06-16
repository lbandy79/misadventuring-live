/**
 * Keeper Threats API — Firestore CRUD for the GM's world-building compendium.
 *
 * Collection: `keeper-threats`
 * One document per threat (monster, minion, bystander, or location).
 * Admin-only read and write — private Keeper prep, not audience-facing.
 *
 * All four categories share the same collection and base fields.
 * Category-specific fields are optional and present only when relevant.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThreatCategory = 'monster' | 'minion' | 'bystander' | 'location';

export interface ThreatWeakness {
  category: 'direct' | 'environment' | 'ritual';
  text: string;
}

export interface ThreatAttack {
  name: string;
  harm: number;
  tags: string[];
}

export interface ThreatCustomMove {
  trigger: string;
  effect: string;
}

export interface KeeperThreat {
  id: string;
  category: ThreatCategory;
  name: string;
  typeId: string;
  motivation: string;     // snapshot from system JSON at save time

  // Description — double duty as creative brief for MidJourney
  description: string;

  // Monster & minion combat stats
  attack?: ThreatAttack;
  armour?: number;
  harmCapacity?: number;

  // Monster only
  powers?: string[];
  weaknesses?: ThreatWeakness[];

  // Monster, minion, location
  customMoves?: ThreatCustomMove[];
  standardMoves?: string[];   // names selected from the system JSON moves list

  // Bystander only
  weapon?: ThreatAttack;

  createdAt: Date;
  updatedAt: Date;
}

export type KeeperThreatCreate = Omit<KeeperThreat, 'id' | 'createdAt' | 'updatedAt'>;
export type KeeperThreatUpdate = Partial<Omit<KeeperThreat, 'id' | 'category' | 'createdAt'>>;

const COLLECTION = 'keeper-threats';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toKeeperThreat(id: string, data: Record<string, unknown>): KeeperThreat {
  return {
    id,
    category: data.category as ThreatCategory,
    name: data.name as string,
    typeId: data.typeId as string,
    motivation: data.motivation as string,
    description: data.description as string,
    attack: data.attack as ThreatAttack | undefined,
    armour: data.armour as number | undefined,
    harmCapacity: data.harmCapacity as number | undefined,
    powers: data.powers as string[] | undefined,
    weaknesses: data.weaknesses as ThreatWeakness[] | undefined,
    customMoves: data.customMoves as ThreatCustomMove[] | undefined,
    standardMoves: data.standardMoves as string[] | undefined,
    weapon: data.weapon as ThreatAttack | undefined,
    createdAt: (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createKeeperThreat(threat: KeeperThreatCreate): Promise<KeeperThreat> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...threat,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toKeeperThreat(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateKeeperThreat(id: string, updates: KeeperThreatUpdate): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteKeeperThreat(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getKeeperThreat(id: string): Promise<KeeperThreat | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return toKeeperThreat(snap.id, snap.data() as Record<string, unknown>);
}

/** Real-time subscription to all threats — dashboard use. */
export function subscribeToKeeperThreats(
  callback: (threats: KeeperThreat[]) => void,
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toKeeperThreat(d.id, d.data() as Record<string, unknown>)));
  });
}

/** Fetch all threats by category (for filtered views). */
export async function getKeeperThreatsByCategory(category: ThreatCategory): Promise<KeeperThreat[]> {
  const q = query(
    collection(db, COLLECTION),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toKeeperThreat(d.id, d.data() as Record<string, unknown>));
}
