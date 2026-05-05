/**
 * Reservation email — thin re-export of the legacy `utils/email.ts`
 * helper so platform code can import everything reservation-related
 * from `@mtp/lib`.
 *
 * The underlying implementation still lives in `src/utils/email.ts`
 * to avoid disturbing the legacy `/create` flow during Phase 5. A
 * future phase can move the implementation here and have the legacy
 * file re-export from lib.
 */

export { sendReservationEmail } from '../../utils/email';
