/**
 * `src/lib/auth` — Phase 8 auth foundation.
 *
 * Single Firebase Auth wrapper used by both legacy and platform apps.
 * Phase 8 only mounts it on the platform; legacy admin panel still uses
 * its existing VITE_ADMIN_PASSWORD gate. Migrating that is its own
 * follow-up (low priority — local dev only currently).
 */

export { AuthProvider, useAuth, type AuthContextValue } from './AuthProvider';
