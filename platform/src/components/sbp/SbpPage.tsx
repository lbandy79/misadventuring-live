/**
 * Shared shell for Misadventuring Labs / SBP pages: paper look with the
 * show's accent, plus the cast gate every Labs page needs.
 *
 * Usage:
 *   const gate = useSbpGate();
 *   if (gate) return gate;            // loading / sign-in / not-cast screens
 *   return <SbpPage>…</SbpPage>;
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import { Doodle } from '../Doodle';
import './sbp.css';

export const SBP_SHOW_ID = 'soggy-bottom-pirates';

const ACCENT_STYLE = {
  '--accent': '#e4a11b',
  '--accent-ink': '#1a1a1a',
} as CSSProperties;

export function SbpPage({
  children,
  className = '',
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <section
      className={`page-card sbp-page ${wide ? 'sbp-page--wide' : ''} ${className}`}
      style={ACCENT_STYLE}
      data-show={SBP_SHOW_ID}
    >
      {children}
    </section>
  );
}

export function SbpHeader({ eyebrow = 'Misadventuring Labs', title, back }: {
  eyebrow?: string;
  title: string;
  back?: { to: string; label: string };
}) {
  return (
    <header className="join-header sbp-header">
      {back && <Link to={back.to} className="wizard-back-link">← {back.label}</Link>}
      <p className="join-eyebrow">{eyebrow}</p>
      <h1 className="join-title">{title}</h1>
    </header>
  );
}

/** Returns a full-page guard element while the viewer can't proceed, else null. */
export function useSbpGate(): ReactElement | null {
  const { user, isLoading, isCast, isCastLoading, isAdmin, isAdminLoading, signIn } = useAuth();

  if (isLoading || (user && (isCastLoading || isAdminLoading))) {
    return (
      <SbpPage>
        <p className="join-loading">Checking your crew status…</p>
      </SbpPage>
    );
  }

  if (!user) {
    return (
      <SbpPage>
        <Doodle name="shipwreck" top="-18px" right="-24px" rotation={8} opacity={0.7} width="110px" />
        <SbpHeader title="Soggy Bottom Pirates" />
        <p className="join-subtitle">Crew only. Sign in with your Google account to get aboard.</p>
        <button type="button" className="btn-primary btn-block" onClick={() => signIn().catch(console.error)}>
          Sign in with Google
        </button>
      </SbpPage>
    );
  }

  if (!isCast && !isAdmin) {
    return (
      <SbpPage>
        <SbpHeader title="You're not on the crew list." />
        <p className="join-subtitle">
          Signed in as <strong>{user.email}</strong>. The GM needs to add your email to the cast list first.
        </p>
        <p className="join-subtitle"><Link to="/">← Back home</Link></p>
      </SbpPage>
    );
  }

  return null;
}
