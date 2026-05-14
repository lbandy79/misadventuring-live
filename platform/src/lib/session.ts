/**
 * Audience session management — localStorage, 90-day expiry.
 *
 * Set by ReturnPage after resolving a magic token or access code.
 * Read by MyCharactersPage to identify the current audience member.
 */

const SESSION_KEY = 'mtp.audience.session';
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface AudienceSession {
  email: string;
  expiresAt: number;
}

export function setAudienceSession(email: string): void {
  const session: AudienceSession = {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAudienceSession(): AudienceSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AudienceSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAudienceSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
