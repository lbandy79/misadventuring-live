/**
 * AuthMenu — Header sign-in / account widget.
 *
 * Anonymous: shows a "Sign in" button.
 * Signed in: shows the user's photo + name and an "Admin" badge if
 * their email is on the admin allowlist; clicking opens a small menu
 * with a sign-out action and (for admins) a link to /admin.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@mtp/lib';

export default function AuthMenu() {
  const { user, isLoading, isAdmin, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (isLoading) {
    return <div className="auth-menu auth-menu-loading" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        className="auth-signin"
        onClick={() => {
          signIn().catch((err) => {
            console.error('Sign-in failed:', err);
          });
        }}
      >
        Sign in
      </button>
    );
  }

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="auth-menu" ref={wrapperRef}>
      <button
        type="button"
        className="auth-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="auth-avatar" />
        ) : (
          <span className="auth-avatar auth-avatar-fallback">{initial}</span>
        )}
        {isAdmin && <span className="auth-admin-pip" title="Admin">★</span>}
      </button>
      {open && (
        <div className="auth-popover" role="menu">
          <div className="auth-popover-head">
            <strong>{user.displayName || user.email}</strong>
            {user.displayName && user.email && (
              <span className="auth-popover-email">{user.email}</span>
            )}
            {isAdmin && <span className="auth-admin-badge">Admin</span>}
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="auth-popover-item"
              onClick={() => setOpen(false)}
            >
              Open admin panel
            </Link>
          )}
          <button
            type="button"
            className="auth-popover-item auth-popover-signout"
            onClick={() => {
              setOpen(false);
              signOut().catch((err) => console.error('Sign-out failed:', err));
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
