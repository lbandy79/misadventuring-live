/**
 * WriteInSpotlightPage — /admin/spotlight
 *
 * The GM's teleprompter for audience write-ins, built for a touch tablet on
 * stage: one write-in at a time in large type, a queue rail grouped by
 * prompt, and a thumb-height action bar (Next / Pin / Used / Hide).
 * Keyboard shortcuts mirror every button when a keyboard is attached.
 *
 * Triage state lives on the admin-only session doc (`writeInStates`), so
 * nothing here touches the audience vote docs. The classic /admin panel is
 * unchanged and remains the fallback.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import { useShow } from '@mtp/lib/shows';
import { getMonsterConfig, type MonsterBuilderConfig } from '@mtp/data/liveMonster';
import { setSlotResult, setWriteInState, type WriteInState } from '@mtp/lib/liveMonster/liveMonsterApi';
import {
  buildWriteInGroups,
  canRevealWriteIn,
  nextPendingId,
  pinnedItems,
  previousId,
  readingOrder,
  totalPending,
  type WriteInItem,
} from '@mtp/lib/liveMonster/writeInQueue';
import SpotlightCard from '../components/spotlight/SpotlightCard';
import QueueRail from '../components/spotlight/QueueRail';
import ActionBar from '../components/spotlight/ActionBar';
import PinnedTray from '../components/spotlight/PinnedTray';
import UndoToast from '../components/spotlight/UndoToast';
import { useWriteInFeed } from '../components/spotlight/useWriteInFeed';
import { useWakeLock } from '../components/spotlight/useWakeLock';
import './WriteInSpotlightPage.css';

const TOAST_MS = 10_000;
const HIDE_ARM_MS = 4_000;

type TriageState = Omit<WriteInState, 'updatedAt'>;

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="wis-root wis-root--message">
      <div className="wis-message">{children}</div>
    </div>
  );
}

export default function WriteInSpotlightPage() {
  const { user, isAdmin, isLoading, isAdminLoading } = useAuth();
  const { showId } = useShow();

  if (isLoading || (user && isAdminLoading)) {
    return <Shell><p>Checking your admin status…</p></Shell>;
  }
  if (!user || !isAdmin) {
    return (
      <Shell>
        <h1>GM only</h1>
        <p>
          <Link to="/admin">Sign in on the admin page</Link> with an allowlisted
          Google account, then come back here.
        </p>
      </Shell>
    );
  }

  const config = showId ? getMonsterConfig(showId) : null;
  if (!showId || !config) {
    return (
      <Shell>
        <h1>No monster config</h1>
        <p>
          <code>config/platform.currentShowId</code> is <code>{showId ?? '(none)'}</code>,
          which has no Live Monster config registered.
        </p>
        <p><Link to="/admin">← Back to admin</Link></p>
      </Shell>
    );
  }

  // key: a show flip remounts with fresh state instead of carrying ids across shows.
  return <Spotlight key={showId} showId={showId} config={config} />;
}

interface SpotlightProps {
  showId: string;
  config: MonsterBuilderConfig;
}

interface Toast {
  message: string;
  undoable: boolean;
  isError?: boolean;
  /** Bumped on every toast so the dismiss timer restarts. */
  seq: number;
}

function Spotlight({ showId, config }: SpotlightProps) {
  useWakeLock();
  const { session, votesBySlot, loaded } = useWriteInFeed(showId, config);
  const states = session?.writeInStates;
  const slotResults = session?.slotResults;

  const groups = useMemo(
    () => buildWriteInGroups(config.slots, votesBySlot, states, slotResults),
    [config, votesBySlot, states, slotResults],
  );
  const [slotFilter, setSlotFilter] = useState<string | null>(null);
  const order = useMemo(() => readingOrder(groups, slotFilter), [groups, slotFilter]);
  const itemsById = useMemo(
    () => new Map(groups.flatMap((g) => g.items).map((i) => [i.id, i] as const)),
    [groups],
  );
  const pinned = useMemo(() => pinnedItems(groups), [groups]);
  const pendingCount = totalPending(groups);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const found = currentId ? itemsById.get(currentId) : undefined;
  const current: WriteInItem | null = found && found.status !== 'hidden' ? found : null;

  // Ids the GM has already been shown or that existed when the page loaded.
  const [knownIds, setKnownIds] = useState<Set<string> | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [hideArmed, setHideArmed] = useState<string | null>(null);
  const [revealArmed, setRevealArmed] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastAction, setLastAction] = useState<{ id: string; prev: TriageState | null } | null>(null);
  const toastSeq = useRef(0);
  // Hidden this session but possibly not yet reflected by the snapshot —
  // keeps the auto-fill below from flashing a just-hidden item back up.
  const hiddenLocally = useRef(new Set<string>());

  const showToast = useCallback((message: string, undoable: boolean, isError = false) => {
    toastSeq.current += 1;
    setToast({ message, undoable, isError, seq: toastSeq.current });
  }, []);

  const show = useCallback((id: string | null) => {
    setCurrentId(id);
    setHideArmed(null);
    setRevealArmed(null);
    if (id) setKnownIds((prev) => new Set(prev ?? []).add(id));
  }, []);

  useEffect(() => {
    if (loaded && knownIds === null) setKnownIds(new Set(itemsById.keys()));
  }, [loaded, knownIds, itemsById]);

  // Only fill the spotlight when it's empty — never swap out what the GM is reading.
  useEffect(() => {
    if (!loaded || current) return;
    const id = nextPendingId(order.filter((i) => !hiddenLocally.current.has(i.id)), null);
    if (id) show(id);
  }, [loaded, current, order, show]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => { setToast(null); setLastAction(null); }, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!hideArmed) return;
    const t = setTimeout(() => setHideArmed(null), HIDE_ARM_MS);
    return () => clearTimeout(t);
  }, [hideArmed]);

  useEffect(() => {
    if (!revealArmed) return;
    const t = setTimeout(() => setRevealArmed(null), HIDE_ARM_MS);
    return () => clearTimeout(t);
  }, [revealArmed]);

  const canReveal = !!current && canRevealWriteIn(current, session?.phase, slotResults);

  const newItems = useMemo(
    () => (knownIds ? order.filter((i) => i.status === 'pending' && !knownIds.has(i.id)) : []),
    [order, knownIds],
  );

  const write = useCallback((item: WriteInItem, next: TriageState | null, label: string) => {
    const raw = states?.[item.id];
    setLastAction({ id: item.id, prev: raw ? { text: raw.text, status: raw.status, pinned: !!raw.pinned } : null });
    showToast(label, true);
    setWriteInState(showId, item.id, next).catch((err) => {
      console.error('WriteInSpotlight: save failed', err);
      setLastAction(null);
      showToast("Didn't save. Check the connection and try again.", false, true);
    });
  }, [showId, states, showToast]);

  const next = useCallback(() => {
    const id = nextPendingId(order, current?.id ?? null);
    if (id) show(id);
    else showToast('Nothing else pending.', false);
  }, [order, current, show, showToast]);

  const prev = useCallback(() => {
    const id = previousId(order, current?.id ?? null);
    if (id) show(id);
  }, [order, current, show]);

  const togglePin = useCallback(() => {
    if (!current) return;
    write(current, { text: current.text, status: current.status, pinned: !current.pinned },
      current.pinned ? 'Unpinned' : 'Pinned for later');
  }, [current, write]);

  const toggleUsed = useCallback(() => {
    if (!current) return;
    const marking = current.status !== 'used';
    write(current, { text: current.text, status: marking ? 'used' : 'pending', pinned: current.pinned },
      marking ? 'Marked used' : 'Back to pending');
    if (marking) {
      const id = nextPendingId(order, current.id);
      if (id) show(id);
    }
  }, [current, order, write, show]);

  const hide = useCallback(() => {
    if (!current) return;
    if (hideArmed !== current.id) { setHideArmed(current.id); return; }
    hiddenLocally.current.add(current.id);
    write(current, { text: current.text, status: 'hidden', pinned: current.pinned }, 'Hidden');
    show(nextPendingId(order, current.id));
  }, [current, hideArmed, order, write, show]);

  // Public and not undoable (/admin has no un-reveal either), so it takes two taps.
  const reveal = useCallback(() => {
    if (!current || !canReveal) return;
    if (revealArmed !== current.id) { setRevealArmed(current.id); return; }
    setRevealArmed(null);
    setLastAction(null);
    showToast('Revealed on the projector', false);
    setSlotResult(showId, current.slotId, current.text).catch((err) => {
      console.error('WriteInSpotlight: reveal failed', err);
      showToast("Reveal didn't save. Check the connection, or reveal from /admin.", false, true);
    });
  }, [current, canReveal, revealArmed, showId, showToast]);

  const unhide = useCallback((id: string) => {
    const item = itemsById.get(id);
    hiddenLocally.current.delete(id);
    if (item) write(item, { text: item.text, status: 'pending', pinned: item.pinned }, 'Unhidden');
  }, [itemsById, write]);

  const undo = useCallback(() => {
    if (!lastAction) return;
    const { id, prev: prevState } = lastAction;
    setLastAction(null);
    hiddenLocally.current.delete(id);
    setWriteInState(showId, id, prevState).catch((err) => {
      console.error('WriteInSpotlight: undo failed', err);
      showToast("Undo didn't save. Check the connection.", false, true);
    });
    show(id);
    showToast('Undone', false);
  }, [lastAction, showId, show, showToast]);

  const jumpToNew = useCallback(() => {
    const newest = [...newItems].sort(
      (a, b) => (b.submittedAtMs ?? Infinity) - (a.submittedAtMs ?? Infinity) || a.id.localeCompare(b.id),
    )[0];
    setKnownIds((prev) => {
      const s = new Set(prev ?? []);
      newItems.forEach((i) => s.add(i.id));
      return s;
    });
    if (newest) show(newest.id);
  }, [newItems, show]);

  const selectPinned = useCallback((id: string) => { show(id); setTrayOpen(false); }, [show]);

  // Keyboard shortcuts. A ref keeps the listener stable while handlers change.
  const keys = useRef({ next, prev, togglePin, toggleUsed, hide, undo, reveal });
  keys.current = { next, prev, togglePin, toggleUsed, hide, undo, reveal };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const k = keys.current;
      switch (e.key) {
        case 'ArrowRight': k.next(); break;
        // Space on a focused button already clicks it — don't also advance.
        case ' ': if (target?.closest('button')) return; k.next(); break;
        case 'ArrowLeft': k.prev(); break;
        case 'p': case 'P': k.togglePin(); break;
        case 'u': case 'U': k.toggleUsed(); break;
        case 'h': case 'H': k.hide(); break;
        case 'z': case 'Z': k.undo(); break;
        case 'r': case 'R': k.reveal(); break;
        case 'Escape': setTrayOpen(false); setHideArmed(null); setRevealArmed(null); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="wis-root" data-show={showId}>
      <header className="wis-top">
        <div className="wis-top-title">
          <Link to="/admin" className="wis-link-btn">← Admin</Link>
          <h1>{config.showName}</h1>
          <span className="wis-phase">Phase: {session?.phase ?? 'idle'}</span>
        </div>
        <div className="wis-top-actions">
          {newItems.length > 0 && (
            <button type="button" className="wis-btn wis-btn--new" onClick={jumpToNew}>
              {newItems.length} new
            </button>
          )}
          <button
            type="button"
            className="wis-btn"
            aria-expanded={trayOpen}
            onClick={() => setTrayOpen((o) => !o)}
          >
            ★ Pinned ({pinned.length})
          </button>
        </div>
      </header>

      <main className="wis-main">
        <SpotlightCard
          item={current}
          pendingCount={pendingCount}
          canReveal={canReveal}
          revealArmed={!!current && revealArmed === current.id}
          onReveal={reveal}
        />
        <QueueRail
          groups={groups}
          slotFilter={slotFilter}
          onFilter={setSlotFilter}
          currentId={current?.id ?? null}
          onSelect={show}
          onUnhide={unhide}
        />
      </main>

      <PinnedTray open={trayOpen} items={pinned} onSelect={selectPinned} onClose={() => setTrayOpen(false)} />

      <UndoToast
        message={toast?.message ?? null}
        canUndo={!!toast?.undoable && !!lastAction}
        isError={toast?.isError}
        onUndo={undo}
      />

      <ActionBar
        item={current}
        canPrev={previousId(order, current?.id ?? null) !== null}
        hideArmed={!!current && hideArmed === current.id}
        onPrev={prev}
        onNext={next}
        onPin={togglePin}
        onUsed={toggleUsed}
        onHide={hide}
      />
    </div>
  );
}
