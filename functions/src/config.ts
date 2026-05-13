/**
 * Shared runtime config for Firebase Functions.
 *
 * ALLOWED_ORIGINS controls which origins may call onCall functions.
 * Update this list if the production domain or preview pattern changes.
 *
 *   production   — app.themisadventuringparty.com
 *   previews     — *.vercel.app  (all Vercel preview deployments)
 *   local dev    — localhost:3001 (platform Vite server, per platform/vite.config.ts)
 */
export const ALLOWED_ORIGINS: Array<string | RegExp> = [
  'https://app.themisadventuringparty.com',
  /\.vercel\.app$/,
  'http://localhost:3001',
];
