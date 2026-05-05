/**
 * Reservations Firestore API.
 *
 * Phase 5: pulls the create / lookup logic out of the legacy
 * `ReservationForm` and `AccessCodeEntry` components so the platform
 * reserve flow can call the same code paths.
 *
 * All writes match the shape validated by `firestore.rules` (Phase 1):
 *   { name, email, accessCode, createdAt, npcCreated:false, showId }
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { Reservation } from '../../types/reservation.types';
import { generateAccessCode, normalizeAccessCode } from './accessCode';

export interface CreateReservationInput {
  name: string;
  email: string;
  showId: string;
}

export type CreateReservationResult =
  | { status: 'created'; reservation: Reservation }
  | { status: 'existing'; reservation: Reservation };

/**
 * Create a reservation. If a reservation already exists for this
 * (email, showId) pair, returns the existing one instead of creating
 * a duplicate. This matches the legacy ReservationForm behavior.
 */
export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const showId = input.showId;

  if (!name || name.length < 2) {
    throw new Error('Please enter your name.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email.');
  }
  if (!showId) {
    throw new Error('Pick a show before reserving.');
  }

  const existingSnap = await getDocs(
    query(
      collection(db, 'reservations'),
      where('email', '==', email),
      where('showId', '==', showId),
      limit(1),
    ),
  );

  if (!existingSnap.empty) {
    const docRef = existingSnap.docs[0];
    return {
      status: 'existing',
      reservation: { id: docRef.id, ...(docRef.data() as Omit<Reservation, 'id'>) },
    };
  }

  const data = {
    name,
    email,
    accessCode: generateAccessCode(),
    createdAt: Date.now(),
    npcCreated: false,
    showId,
  };

  const docRef = await addDoc(collection(db, 'reservations'), data);
  return {
    status: 'created',
    reservation: { id: docRef.id, ...data },
  };
}

/**
 * Look up a reservation by access code (and optional showId scope).
 * Returns null if not found.
 */
export async function findReservationByCode(
  code: string,
  showId?: string,
): Promise<Reservation | null> {
  const normalized = normalizeAccessCode(code);
  if (normalized.length !== 6) return null;

  const constraints = [
    where('accessCode', '==', normalized),
    ...(showId ? [where('showId', '==', showId)] : []),
    limit(1),
  ];
  const snap = await getDocs(query(collection(db, 'reservations'), ...constraints));
  if (snap.empty) return null;
  const docRef = snap.docs[0];
  return { id: docRef.id, ...(docRef.data() as Omit<Reservation, 'id'>) };
}
