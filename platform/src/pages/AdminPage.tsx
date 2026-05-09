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
import MadLibsAdminPanel from '../components/admin/MadLibsAdminPanel';

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

  return (
    <section className="page-card">
      <h1>Admin</h1>
      <p>
        Welcome, <strong>{user.displayName || user.email}</strong>. Phase 8
        ships the auth foundation — admin role works, and rules now require
        admin auth for sensitive writes (current-show selection, NPC
        deletion, GM-flagging).
      </p>
      <div className="placeholder-banner">
        The full admin panel still lives in the legacy app at{' '}
        <a href="/admin" target="_blank" rel="noreferrer">/admin</a>. A future
        phase will absorb it here and replace its password gate with this
        Google sign-in flow.
      </div>

      {/* Mad Libs live tallies — one panel per show that defines mad libs. */}
      {shows
        .filter((s) => s.id === 'mad-libs-honey-heist')
        .map((s) => (
          <MadLibsAdminPanel
            key={s.id}
            showId={s.id}
            systemId={s.systemId}
            showName={s.name}
          />
        ))}

      <h2>What you can do here today</h2>
      <ul>
        <li>
          Set the platform's currently-running show via{' '}
          <code>setCurrentShow(showId)</code> (rules now require admin auth).
        </li>
        <li>Manage the admin allowlist by editing <code>config/admins.emails</code>.</li>
        <li>Delete NPCs and toggle GM-flagging (rules now require admin auth).</li>
      </ul>
    </section>
  );
}
