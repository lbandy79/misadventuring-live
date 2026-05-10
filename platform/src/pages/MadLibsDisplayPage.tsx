/**
 * MadLibsDisplayPage — projector / "big screen" view for any Mad Libs show.
 *
 * ─── Reusability ─────────────────────────────────────────────────────────
 * This page is **system-agnostic**. It does not know or care that we're
 * running Honey Heist. It re-renders for any show whose `systemId` config
 * exposes a `showConfig.madLibs[]` array (same shape as
 * `src/systems/honey-heist.system.json`). Add Mad Libs to Kids on Bikes,
 * Blade Runner, anything else by:
 *
 *   1. Adding `showConfig.madLibs[]` to that system's `*.system.json`.
 *   2. Registering the show in `src/lib/shows/registry.ts` (so `getShow`
 *      resolves a name + accent colors for theming).
 *   3. Routing audience to `/shows/<showId>/vote` and projector to
 *      `/shows/<showId>/display`. No code changes needed here.
 *
 * The Mad Libs "template" is therefore four cooperating surfaces:
 *   - MadLibsGatewayPage   — onboarding (reservation lookup / anon)
 *   - MadLibsVotePage      — audience phone view (voting + idle states)
 *   - MadLibsAdminPanel    — GM controls (push, lock, reset, delete)
 *   - MadLibsDisplayPage   — projector (this file)
 *
 * Plus the Firestore API in `src/lib/madlibs/madLibsApi.ts`. Treat the
 * collection-name constants and `castVote/setMadLibLock/setActiveMadLib`
 * as the public contract — any system that conforms gets the whole UX
 * for free.
 *
 * ─── Theming ─────────────────────────────────────────────────────────────
 * Pulls `show.accentColor` / `show.accentInk` from the registry and pipes
 * them as CSS custom properties (`--display-accent`, `--display-on-accent`)
 * so individual show themes can restyle without forking this component.
 *
 * ─── Modes ───────────────────────────────────────────────────────────────
 *  IDLE       no active Mad Lib  →  show title + venue + QR to /vote
 *  OPEN       active + unlocked  →  prompt + live tally bars per field
 *  REVEAL     active + locked    →  winning option per field, animated in
 *
 * `?mode=preview` query param forces REVEAL with mock data so the GM can
 * rehearse without locking real votes.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  getShow,
  subscribeToActiveMadLib,
  subscribeToMadLibLock,
  subscribeToMadLibVotes,
  tallyVotes,
  type ActiveMadLibPointer,
  type FieldTally,
  type MadLibLock,
  type MadLibVote,
} from '@mtp/lib';

// ─── Local types matching the system.json schema ────────────────────────
// Kept local (not imported from @mtp/lib) so adding new optional fields to
// system configs doesn't ripple through the shared types package.
interface MadLibField {
  id: string;
  label: string;
  type: 'select';
  options: string[];
}
interface MadLibTemplate {
  id: string;
  title: string;
  phase: string;
  prompt: string;
  fields?: MadLibField[];
}
interface SystemConfig {
  showConfig?: {
    showName?: string;
    venue?: string;
    date?: string;
    madLibs?: MadLibTemplate[];
  };
}

/**
 * Default-Mad-Lib resolver. Mirrors the one in MadLibsVotePage so the
 * projector and the audience phones agree on what's "showing" when the
 * admin hasn't pushed anything yet. Prefers a `phase: 'pre-show'` entry
 * (the typical reservation-time setup) and falls back to the first
 * configured Mad Lib so display never renders an empty IDLE by accident.
 */
function resolveDefaultMadLibId(
  madLibs: MadLibTemplate[] | undefined,
): string | null {
  if (!madLibs || madLibs.length === 0) return null;
  const preShow = madLibs.find((m) => m.phase === 'pre-show');
  return (preShow ?? madLibs[0]).id;
}

export default function MadLibsDisplayPage() {
  const { showId } = useParams<{ showId: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('mode') === 'preview';

  const show = showId ? getShow(showId) : undefined;
  const systemId = show?.systemId;

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activePointer, setActivePointer] =
    useState<ActiveMadLibPointer | null>(null);
  const [lock, setLock] = useState<MadLibLock | null>(null);
  const [votes, setVotes] = useState<MadLibVote[]>([]);

  // ── Load system config (same dynamic-import pattern as the vote page) ─
  useEffect(() => {
    if (!systemId) return;
    (async () => {
      try {
        const mod = await import(`../../../src/systems/${systemId}.system.json`);
        setConfig((mod.default ?? mod) as SystemConfig);
      } catch (err) {
        console.error('Failed to load system config:', err);
        setConfigError('Could not load the show config.');
      }
    })();
  }, [systemId]);

  // ── Resolve which Mad Lib to render ──────────────────────────────────
  // Pointer wins; if the admin has explicitly cleared (pointer doc exists
  // with `activeMadLibId: null`) we treat that as IDLE. If no pointer doc
  // exists yet, we fall back to the default so the projector is never
  // blank during walk-in.
  const defaultMadLibId = useMemo(
    () => resolveDefaultMadLibId(config?.showConfig?.madLibs),
    [config],
  );
  const activeMadLibId: string | null =
    activePointer === null
      ? defaultMadLibId
      : (activePointer.activeMadLibId ?? null);

  const activeMadLib = useMemo<MadLibTemplate | undefined>(() => {
    if (!activeMadLibId) return undefined;
    return config?.showConfig?.madLibs?.find((m) => m.id === activeMadLibId);
  }, [config, activeMadLibId]);

  // ── Subscribe to admin pointer ───────────────────────────────────────
  useEffect(() => {
    if (!showId) return;
    const unsub = subscribeToActiveMadLib(
      { showId },
      (next) => setActivePointer(next),
    );
    return unsub;
  }, [showId]);

  // ── Subscribe to lock + votes for the active Mad Lib ─────────────────
  useEffect(() => {
    if (!showId || !activeMadLibId) {
      setLock(null);
      setVotes([]);
      return;
    }
    const unsubLock = subscribeToMadLibLock(
      { showId, madLibId: activeMadLibId },
      (next) => setLock(next),
    );
    const unsubVotes = subscribeToMadLibVotes(
      { showId, madLibId: activeMadLibId },
      (next) => setVotes(next),
    );
    return () => {
      unsubLock();
      unsubVotes();
    };
  }, [showId, activeMadLibId]);

  // ── Theming via CSS custom properties ────────────────────────────────
  // Show authors set `accentColor` / `accentInk` on the registry entry.
  // Anything inside `.madlibs-display` can `var(--display-accent)` for
  // theme-aware highlights without this component knowing show specifics.
  const themeStyle = {
    '--display-accent': show?.accentColor ?? '#e0a022',
    '--display-on-accent': show?.accentInk ?? '#1c1c1c',
  } as React.CSSProperties;

  // ─── Render guards ───────────────────────────────────────────────────
  if (!showId || !show) {
    return (
      <section className="page-card">
        <h1>Show not found</h1>
        <p>No show is registered with id "{showId}".</p>
      </section>
    );
  }
  if (configError) {
    return (
      <section className="page-card">
        <h1>{show.name}</h1>
        <p>{configError}</p>
      </section>
    );
  }
  if (!config) {
    return (
      <section className="madlibs-display madlibs-display-loading" style={themeStyle}>
        <p>Loading…</p>
      </section>
    );
  }

  // ── Mode selection ───────────────────────────────────────────────────
  // Preview short-circuits to REVEAL (with the default Mad Lib) so the GM
  // can rehearse the reveal animation without touching real lock state.
  const isManualLocked = !!lock?.manualLockedAt;
  const mode: 'idle' | 'open' | 'reveal' = isPreview
    ? 'reveal'
    : !activeMadLib
      ? 'idle'
      : isManualLocked
        ? 'reveal'
        : 'open';

  // Audience join URL — what the QR encodes. Uses the live origin so the
  // same code works on localhost, preview deploys, and prod custom domain.
  const voteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/shows/${showId}/vote`
      : `/shows/${showId}/vote`;

  return (
    <section className={`madlibs-display madlibs-display-${mode}`} style={themeStyle}>
      {mode === 'idle' && (
        <DisplayIdle show={show} voteUrl={voteUrl} />
      )}
      {mode === 'open' && activeMadLib && (
        <DisplayOpen madLib={activeMadLib} votes={votes} voteUrl={voteUrl} />
      )}
      {mode === 'reveal' && activeMadLib && (
        <DisplayReveal madLib={activeMadLib} votes={votes} isPreview={isPreview} />
      )}

      {/* Admin escape hatch — only visible because this URL is hand-shared. */}
      <p className="madlibs-display-footer">
        <Link to={`/shows/${showId}`}>← Back to show</Link>
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// IDLE — pre-show / between Mad Libs.
// Big show name, venue/date, QR code so walk-ins can join.
// Reusable across systems: nothing here is Honey-Heist-specific.
// ─────────────────────────────────────────────────────────────────────────
function DisplayIdle({
  show,
  voteUrl,
}: {
  show: { name: string; nextDate?: string };
  voteUrl: string;
}) {
  const dateLabel = show.nextDate
    ? new Date(show.nextDate + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;
  return (
    <div className="madlibs-display-idle">
      <p className="madlibs-display-eyebrow">Tonight at The Misadventuring Party</p>
      <h1 className="madlibs-display-title">{show.name}</h1>
      {dateLabel && <p className="madlibs-display-date">{dateLabel}</p>}

      <div className="madlibs-display-qr-block">
        <div className="madlibs-display-qr">
          <QRCodeSVG value={voteUrl} size={280} includeMargin />
        </div>
        <div className="madlibs-display-qr-caption">
          <p className="madlibs-display-qr-label">Scan to play along</p>
          <p className="madlibs-display-qr-url">{stripScheme(voteUrl)}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OPEN — voting in progress. Shows the prompt and a live bar chart per
// field. Re-renders on every Firestore vote update.
// ─────────────────────────────────────────────────────────────────────────
function DisplayOpen({
  madLib,
  votes,
  voteUrl,
}: {
  madLib: MadLibTemplate;
  votes: MadLibVote[];
  voteUrl: string;
}) {
  const fields = madLib.fields ?? [];
  const tallies = useMemo(
    () =>
      tallyVotes(
        votes,
        fields.map((f) => ({ id: f.id, options: f.options })),
      ),
    [votes, fields],
  );

  return (
    <div className="madlibs-display-open">
      <header className="madlibs-display-open-header">
        <p className="madlibs-display-eyebrow">{madLib.title}</p>
        <h1 className="madlibs-display-prompt">{madLib.prompt}</h1>
        <p className="madlibs-display-join">
          Join: <strong>{stripScheme(voteUrl)}</strong>
        </p>
      </header>

      <ol className="madlibs-display-fields">
        {fields.map((field, i) => (
          <li key={field.id} className="madlibs-display-field">
            <p className="madlibs-display-field-label">
              <span className="madlibs-display-field-num">{i + 1}.</span>{' '}
              {field.label}
            </p>
            <TallyBars field={field} tally={tallies[i]} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function TallyBars({ field, tally }: { field: MadLibField; tally?: FieldTally }) {
  const total = tally?.totalVotes ?? 0;
  return (
    <ul className="madlibs-display-bars">
      {field.options.map((opt, idx) => {
        const count = tally?.counts[idx] ?? 0;
        const pct = total === 0 ? 0 : (count / total) * 100;
        const isLeader = total > 0 && idx === tally?.winnerIndex;
        return (
          <li
            key={idx}
            className={'madlibs-display-bar' + (isLeader ? ' is-leader' : '')}
          >
            <div
              className="madlibs-display-bar-fill"
              style={{ width: `${Math.max(pct, 2)}%` }}
              aria-hidden
            />
            <span className="madlibs-display-bar-text">{opt}</span>
            <span className="madlibs-display-bar-count">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// REVEAL — voting locked. Cards flip in one at a time to show the winner
// per field, then the assembled story plays as a final block.
//
// The reveal animation is pure CSS keyframes; the only JS work here is
// staggering `--reveal-delay` per field. To restyle for a new system,
// override `.madlibs-display-reveal-card` in the system's theme stylesheet.
// ─────────────────────────────────────────────────────────────────────────
function DisplayReveal({
  madLib,
  votes,
  isPreview,
}: {
  madLib: MadLibTemplate;
  votes: MadLibVote[];
  isPreview: boolean;
}) {
  const fields = madLib.fields ?? [];
  const tallies = useMemo(
    () =>
      tallyVotes(
        votes,
        fields.map((f) => ({ id: f.id, options: f.options })),
      ),
    [votes, fields],
  );

  // Preview mode: when there are no real votes yet, fall back to the first
  // option per field so the GM still sees the layout/animation.
  function winnerFor(i: number): string {
    const t = tallies[i];
    const field = fields[i];
    if (!t || !field) return '';
    if (!t.hasVotes) {
      return isPreview ? field.options[0] : '— no votes —';
    }
    return field.options[t.winnerIndex];
  }

  return (
    <div className="madlibs-display-reveal">
      <header className="madlibs-display-reveal-header">
        <p className="madlibs-display-eyebrow">
          {isPreview ? `Preview · ${madLib.title}` : madLib.title}
        </p>
        <h1 className="madlibs-display-reveal-title">The audience has spoken.</h1>
      </header>

      <ol className="madlibs-display-reveal-cards">
        {fields.map((field, i) => (
          <li
            key={field.id}
            className="madlibs-display-reveal-card"
            style={{ ['--reveal-delay' as string]: `${i * 0.4}s` }}
          >
            <p className="madlibs-display-reveal-card-label">{field.label}</p>
            <p className="madlibs-display-reveal-card-winner">{winnerFor(i)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────
function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
