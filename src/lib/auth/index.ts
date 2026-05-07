/**
 * `src/lib/auth` — Firebase Auth foundation.
 *
 * Single Firebase Auth wrapper used by both legacy and platform apps.
 * Phase 8 introduced it on the platform; Phase 9A retired the legacy
 * VITE_ADMIN_PASSWORD gate so the legacy admin panel uses this same
 * isAdmin check.
 */

export { AuthProvider, useAuth, type AuthContextValue } from './AuthProvider';
