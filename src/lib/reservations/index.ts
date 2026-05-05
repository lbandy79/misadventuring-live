/**
 * `src/lib/reservations` — Phase 5 barrel.
 *
 * Shared reservation logic for the legacy `/create` flow and the new
 * platform `/reserve` flow.
 */

export { generateAccessCode, normalizeAccessCode, ACCESS_CODE_LENGTH } from './accessCode';
export {
  createReservation,
  findReservationByCode,
  findReservationsByEmail,
  type CreateReservationInput,
  type CreateReservationResult,
} from './reservationsApi';
export { findNpcByReservationId, findNpcsByReservationIds } from './npcsApi';
export { sendReservationEmail } from './email';
