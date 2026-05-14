/**
 * AdminPage — Phase 8 placeholder.
 *
 * Gated by `useAuth().isAdmin`. The real admin tooling still lives in
 * the legacy app at `/admin` (password-gated). This page exists so:
 *   1. Admins have somewhere to land after Google sign-in.
 *   2. We can prove the role check + Firestore rule path end-to-end.
 *
 * A future phase will absorb the legacy admin panel into the platform
 * and migrate it from password-gating to Firebase Auth.
 */

import { Link } from 'react-router-dom';
import { shows, useAuth } from '@mtp/lib';
import NpcAdminPanel from '../components/admin/NpcAdminPanel';

export default function AdminPage() {
  const { user, isAdmin, isLoading, isAdminLoading, signIn } = useAuth();

  if (isLoading || (user && isAdminLoading)) {
    return (
      <section className="page-card">
        <p className="reserve-subtitle">Checking your admin status…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-card audience-card">
        <h1>Admin sign-in required</h1>
        <p className="reserve-subtitle">
          Sign in with the Google account whose email is on the admin
          allowlist.
        </p>
        <button
          type="button"
          className="btn-primary btn-block"
          onClick={() => signIn().catch(console.error)}
        >
          Sign in with Google
        </button>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="page-card">
        <h1>Not an admin</h1>
        <p>
          Signed in as <strong>{user.email}</strong>, but this email isn't on
          the admin allowlist (<code>config/admins.emails</code>). Add it from
          another admin's session, or sign in with a different account.
        </p>
        <p>
          <Link to="/">← Back home</Link>
        </p>
      </section>
    );
  }

  // NPC Mad Libs shows — shows that use npcCreation format
  const npcShows = shows.filter((s) => s.id === 'mad-libs-honey-heist');

  return (
    <section className="page-card">
      <h1>GM Panel</h1>
      <p className="admin-welcome">
        Signed in as <strong>{user.displayName || user.email}</strong>.
      </p>

      {npcShows.map((s) => (
        <NpcAdminPanel
          key={s.id}
          showId={s.id}
          systemId={s.systemId}
          showName={s.name}
        />
      ))}

      {npcShows.length === 0 && (
        <p className="npc-admin-panel__empty">No NPC shows configured.</p>
      )}
    </section>
  );
}
