/**
 * AdminPage — the GM panel at /admin.
 *
 * Gated by `useAuth().isAdmin` (Google sign-in + config/admins allowlist);
 * the real access control is firestore.rules. Panels are grouped into tabs
 * (see AdminTabs below) so show-night controls aren't buried under the
 * email list and the Labs uploads.
 */

import { Fragment, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { shows, useAuth, useShow } from '@mtp/lib';
import { getMonsterConfig } from '@mtp/data/liveMonster';
import NpcAdminPanel from '../components/admin/NpcAdminPanel';
import CastAdminPanel from '../components/admin/CastAdminPanel';
import LiveMonsterAdminPanel from '../components/admin/LiveMonsterAdminPanel';
import AudienceAdminPanel from '../components/admin/AudienceAdminPanel';
import SbpRulesAdminPanel from '../components/admin/SbpRulesAdminPanel';
import SbpArtAdminPanel from '../components/admin/SbpArtAdminPanel';
import { RumorMillAdminPanel } from '../features/rumor-mill';
import { TowniesAdminPanel, useTowniesConfig } from '../features/townies';
import { ScreenPickerPanel } from '../features/big-screen';

/**
 * The townie panel for one NPC show. Shows that use stingers (Honey Heist)
 * keep the older panel with its stinger, world-vote and email tools; the
 * rest (Green Oaks) get the simpler Townies panel.
 */
function NpcShowPanel({ registryId, systemId, showName }: { registryId: string; systemId: string; showName: string }) {
  const loaded = useTowniesConfig(systemId);
  if (loaded.status === 'loading') {
    return <p className="npc-admin-panel__loading">Loading {showName}…</p>;
  }
  if (loaded.status === 'error' || loaded.config.usesStingers) {
    return <NpcAdminPanel showId={registryId} systemId={systemId} showName={showName} />;
  }
  return <TowniesAdminPanel systemId={systemId} config={loaded.config} />;
}

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
      <h1>GM Panel</h1>
      <p className="admin-welcome">
        Signed in as <strong>{user.displayName || user.email}</strong>.
      </p>
      <AdminTabs />
    </section>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
// The page used to stack every panel in one column. Now:
//   Show night  what the GM drives during the current/upcoming show
//   Audience    the email list
//   Team        cast allowlist + Soggy Bottom Pirates rules and art
//   Past shows  panels for shows that have aired
// The tab is in the URL (?tab=team) so it can be bookmarked, and the last
// one used is remembered on this device.

const TABS = [
  { id: 'show', label: 'Show night' },
  { id: 'audience', label: 'Audience' },
  { id: 'team', label: 'Team' },
  { id: 'past', label: 'Past shows' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TAB_STORAGE_KEY = 'mtp-admin-tab';

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

function readStoredTab(): TabId | null {
  try {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    return isTabId(stored) ? stored : null;
  } catch {
    return null; // private window, blocked storage: fall back to the default
  }
}

function AdminTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showId: currentShowId } = useShow();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const fromUrl = searchParams.get('tab');
  const tab: TabId = isTabId(fromUrl) ? fromUrl : (readStoredTab() ?? 'show');

  function selectTab(next: TabId, focus = false) {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* not remembered; the URL still carries it */
    }
    setSearchParams({ tab: next }, { replace: true });
    if (focus) tabRefs.current[next]?.focus();
  }

  // Arrow keys move between tabs, as the ARIA tabs pattern expects.
  function onKeyDown(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === -1) return;
    e.preventDefault();
    selectTab(TABS[next].id, true);
  }

  // NPC shows (townies, stingers, Rumor Mill). A show moves to "Past shows"
  // when its `era` is flipped in the post-show checklist.
  const npcShows = shows.filter((s) => s.audienceMode === 'npc-creation');
  const isOver = (s: (typeof shows)[number]) => s.era === 'past' || s.era === 'shelved';
  const activeNpcShows = npcShows.filter((s) => !isOver(s));
  const pastNpcShows = npcShows.filter(isOver);

  // The Live Monster panel only does anything when the current show
  // (config/platform.currentShowId) is a Monster of the Week episode.
  const isMonsterNight = !!currentShowId && getMonsterConfig(currentShowId) !== null;

  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="GM panel sections" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={`admin-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`admin-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`admin-tab ${tab === t.id ? 'admin-tab--active' : ''}`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="admin-tabpanel"
        role="tabpanel"
        id={`admin-panel-${tab}`}
        aria-labelledby={`admin-tab-${tab}`}
      >
        {tab === 'show' && (
          <>
            <p className="admin-tab-note">
              Current show: <strong>{currentShowId || 'none set'}</strong>
            </p>

            {isMonsterNight && <LiveMonsterAdminPanel />}

            {/* Rumor Mill renders only for shows whose system JSON has showConfig.rumorMill. */}
            {activeNpcShows.map((s) => (
              <Fragment key={s.id}>
                <ScreenPickerPanel showSlug={s.id} systemId={s.systemId} />
                <RumorMillAdminPanel showSlug={s.id} systemId={s.systemId} />
                <NpcShowPanel registryId={s.id} systemId={s.systemId} showName={s.name} />
              </Fragment>
            ))}

            {!isMonsterNight && (
              <p className="admin-tab-note">
                The Live Monster Builder shows up here when the current show is a Monster of the
                Week episode.
              </p>
            )}
            {!isMonsterNight && activeNpcShows.length === 0 && (
              <p className="npc-admin-panel__empty">Nothing is set up for a show right now.</p>
            )}
          </>
        )}

        {tab === 'audience' && <AudienceAdminPanel />}

        {tab === 'team' && (
          <>
            <CastAdminPanel />
            <SbpRulesAdminPanel />
            <SbpArtAdminPanel />
          </>
        )}

        {tab === 'past' && (
          <>
            {pastNpcShows.map((s) => (
              <NpcShowPanel key={s.id} registryId={s.id} systemId={s.systemId} showName={s.name} />
            ))}
            {pastNpcShows.length === 0 && (
              <p className="npc-admin-panel__empty">No past shows with townies or stingers yet.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
