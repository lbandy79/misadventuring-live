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
  type CreateReservationInput,
  type CreateReservationResult,
} from './reservationsApi';
export { sendReservationEmail } from './email';
