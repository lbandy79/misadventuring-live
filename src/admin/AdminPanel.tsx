import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme, themeRegistry } from '../themes';
import type { ThemeId } from '../themes';
import { useShow, setCurrentShow } from '../lib/shows';
import { useAuth } from '../lib/auth';
import { launchVote, resetVoteCounts } from '../lib/interactions';
import { useAwesomeMix, broadcastCue } from '../hooks';
import type { Villager, VillagerSubmissionState, VillagerStatus } from '../types/villager.types';
import { PRONOUNS_OPTIONS, getItemById } from '../types/villager.types';
import { BUILDER_PART_ORDER, MONSTER_BUILDER_CONFIG, calculateWinner, type MonsterBuilderState } from '../types/monsterBuilder.types';
import { playSound as playSoundEffect, initAudio } from '../utils/sounds';
import DecoderRingAdmin from './DecoderRingAdmin';
import ShipCombatAdmin from './ShipCombatAdmin';
import NPCReviewPanel from './NPCReviewPanel';
import './AdminPanel.css';

// Auth gate: Firebase Auth + admin allowlist (config/admins.emails).
// Replaces the legacy VITE_ADMIN_PASSWORD shared password (Phase 9A).
// Sign in lives in `useAuth().signIn()` and is wired up below.

type AdminTab = 'show' | 'npcs' | 'monsters' | 'villagers' | 'decoder';

const ADMIN_TABS: { id: AdminTab; label: string; emoji: string }[] = [
  { id: 'show', label: 'Show Controls', emoji: '🎲' },
  { id: 'npcs', label: 'NPC Review', emoji: '📋' },
  { id: 'monsters', label: 'Monster Builder', emoji: '🐲' },
  { id: 'villagers', label: 'Villagers', emoji: '🏘️' },
  { id: 'decoder', label: 'Decoder Ring', emoji: '🔮' },
];

interface VoteOption {
  id: string;
  label: string;
  emoji: string;
}

interface VoteConfig {
  question: string;
  options: VoteOption[];
  isOpen: boolean;
  timer: number;
}

interface MadlibsConfig {
  template: string;
}



interface RollConfig {
  prompt: string;
  diceType: string;
  dc: number;
  modifier: number;
}

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'group-roll' | 'villager-submit' | 'monster-builder' | 'decoder-ring' | 'monster-vote' | 'npc-naming' | 'ship-combat' | 'npc-spotlight';
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  currentBlankIndex?: number;
  partIndex?: number;
  status?: string;
}

export default function AdminPanel() {
  const { user, isAdmin, isLoading: authLoading, isAdminLoading, signIn, signOut } = useAuth();
  // Convenience flag used by all the existing data-subscription effects so we
  // don't subscribe to Firestore until the user has cleared the admin gate.
  const isAuthenticated = !!user && isAdmin;
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction>({ type: 'none' });
  const [voteConfig, setVoteConfig] = useState<VoteConfig>({
    question: 'What should the party do?',
    options: [
      { id: 'a', label: 'Fight', emoji: '⚔️' },
      { id: 'b', label: 'Flee', emoji: '🏃' }
    ],
    isOpen: false,
    timer: 60
  });
  const [madlibsConfig, setMadlibsConfig] = useState<MadlibsConfig>({
    template: 'The [ADJECTIVE] wizard casts [SPELL] at the [CREATURE]!',
  });

  const [rollConfig, setRollConfig] = useState<RollConfig>({
    prompt: 'Stealth check to sneak past the guards!',
    diceType: 'd20',
    dc: 15,
    modifier: 0
  });
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [participantCount, setParticipantCount] = useState(0);
  const [isBattleMusicPlaying, setIsBattleMusicPlaying] = useState(false);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [selectedAmbient, setSelectedAmbient] = useState('village');
  const [selectedBattle, setSelectedBattle] = useState('combat');
  const { themeId, setThemeId } = useTheme();
  const { showId: activeShowId, allShows } = useShow();

  // Tab navigation — persisted in sessionStorage
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    return (sessionStorage.getItem('mtp-admin-tab') as AdminTab) || 'show';
  });
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    sessionStorage.setItem('mtp-admin-tab', tab);
  };
  
  // ============ BEAST OF RIDGEFALL STATE ============
  const [monsterBuilderState, setMonsterBuilderState] = useState<MonsterBuilderState | null>(null);
  const [villagerSubmissions, setVillagerSubmissions] = useState<Villager[]>([]);
  const [villagerStatus, setVillagerStatus] = useState<VillagerSubmissionState['status']>('collecting');
  const [showHiddenVillagers, setShowHiddenVillagers] = useState(false);
  const prevVillagerCountRef = useRef<number>(0);
  
  // Awesome Mix hook - only playSound and audioMixer used locally (for unlock/mute buttons)
  // All effects (battle, ambient, celebration, shake) are broadcast-only to Display
  const {
    playSound,
    audioMixer,
  } = useAwesomeMix();

  // Broadcast helpers - send cues to Display (no local audio on admin)
  const broadcastBattle = (start: boolean) => {
    if (start) {
      setIsBattleMusicPlaying(true);
    } else {
      setIsBattleMusicPlaying(false);
    }
    broadcastCue(start ? 'battle-start' : 'battle-end');
  };

  const broadcastCelebration = (type: 'quick' | 'winner' | 'fireworks') => {
    broadcastCue(`celebration-${type}` as 'celebration-quick' | 'celebration-winner' | 'celebration-fireworks');
  };

  const broadcastShake = (intensity: 'light' | 'heavy' | 'earthquake') => {
    broadcastCue(`shake-${intensity}` as 'shake-light' | 'shake-heavy' | 'shake-earthquake');
  };

  const broadcastAmbient = (start: boolean, track?: string) => {
    if (start) {
      const trackName = track || selectedAmbient || 'village';
      setIsAmbientPlaying(true);
      broadcastCue('ambient-start', { soundKey: `/sounds/beast-of-ridgefall/ambient-${trackName}.mp3` });
    } else {
      setIsAmbientPlaying(false);
      broadcastCue('ambient-stop');
    }
  };

  const switchAmbientTrack = (track: string) => {
    setSelectedAmbient(track);
    // If currently playing, broadcast track switch to Display
    if (isAmbientPlaying) {
      broadcastCue('ambient-start', { soundKey: `/sounds/beast-of-ridgefall/ambient-${track}.mp3` });
    }
  };

  const switchBattleTrack = (track: string) => {
    setSelectedBattle(track);
    broadcastCue('sound-effect', { soundKey: `battle-${track}` });
  };

  // Listen to active interaction
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      doc(db, 'config', 'active-interaction'),
      (snapshot) => {
        if (snapshot.exists()) {
          setActiveInteraction(snapshot.data() as ActiveInteraction);
        }
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to vote counts
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      doc(db, 'votes', 'current-vote'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setVoteCounts(data.counts || {});
          setParticipantCount(data.totalVotes || 0);
        } else {
          setVoteCounts({});
          setParticipantCount(0);
        }
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to monster builder state
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      doc(db, 'monster-builder', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          setMonsterBuilderState(snapshot.data() as MonsterBuilderState);
        } else {
          setMonsterBuilderState(null);
        }
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to villager submissions
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      doc(db, 'villagers', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as VillagerSubmissionState;
          const newSubmissions = data.submissions || [];
          
          // Play sound if new submission arrived
          if (newSubmissions.length > prevVillagerCountRef.current && prevVillagerCountRef.current > 0) {
            initAudio();
            playSoundEffect('vote'); // Reuse vote sound for new submission notification
          }
          prevVillagerCountRef.current = newSubmissions.length;
          
          setVillagerSubmissions(newSubmissions);
          setVillagerStatus(data.status);
        } else {
          setVillagerSubmissions([]);
          setVillagerStatus('collecting');
          prevVillagerCountRef.current = 0;
        }
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleLogin = () => {
    signIn().catch((err) => {
      console.error('Sign-in failed:', err);
      alert('Sign-in failed. See console for details.');
    });
  };

  const handleLogout = () => {
    signOut().catch((err) => console.error('Sign-out failed:', err));
  };

  // Activate voting
  const activateVoting = async () => {
    try {
      console.log('Attempting to launch voting...');
      const { sessionId } = await launchVote({
        showId: activeShowId,
        question: voteConfig.question,
        options: voteConfig.options,
        timer: voteConfig.timer,
      });
      console.log('voting launched, sessionId=', sessionId);
    } catch (error) {
      console.error('Failed to launch voting:', error);
      alert(`Failed to launch voting: ${(error as Error).message}`);
    }
  };

  // Close voting (keep results visible)
  const closeVoting = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), {
      ...activeInteraction,
      isOpen: false
    });
  };

  // Reopen voting
  const reopenVoting = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), {
      ...activeInteraction,
      isOpen: true,
      startedAt: Date.now() // Reset timer when reopening!
    });
  };

  // End interaction entirely
  const endInteraction = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), {
      type: 'none'
    });
  };

  // Reset all votes - generates new sessionId so previous votes don't carry over
  const resetVotes = async () => {
    if (!confirm('Reset all votes? This cannot be undone.')) return;
    if (!activeInteraction.options) return;

    await resetVoteCounts({
      showId: activeShowId,
      options: activeInteraction.options,
      activeInteraction: activeInteraction as unknown as Record<string, unknown>,
    });
  };

  // ============ MADLIBS FUNCTIONS ============
  const activateMadlibs = async () => {
    try {
      // Parse template for blanks
      const blanks = [...madlibsConfig.template.matchAll(/\[([A-Z_]+)\]/g)].map(m => m[1]);
      
      const submissions: Record<string, never[]> = {};
      blanks.forEach(b => { submissions[b] = []; });
      
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'madlibs'
      });
      
      await setDoc(doc(db, 'madlibs', 'current'), {
        template: madlibsConfig.template,
        blanks,
        currentBlankIndex: 0,
        submissions,
        winners: {},
        status: 'collecting'
      });
    } catch (error) {
      console.error('Failed to launch madlibs:', error);
      alert(`Failed to launch madlibs: ${(error as Error).message}`);
    }
  };



  // ============ GROUP ROLL FUNCTIONS ============
  const activateGroupRoll = async () => {
    try {
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'group-roll'
      });
      
      await setDoc(doc(db, 'group-roll', 'current'), {
        prompt: rollConfig.prompt,
        diceType: rollConfig.diceType,
        dc: rollConfig.dc,
        modifier: rollConfig.modifier,
        rolls: [],
        status: 'rolling'
      });
    } catch (error) {
      console.error('Failed to launch group roll:', error);
      alert(`Failed to launch group roll: ${(error as Error).message}`);
    }
  };

  // ============ VILLAGER SUBMISSION FUNCTIONS ============
  const activateVillagerSubmission = async () => {
    try {
      const sessionId = `villager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await setDoc(doc(db, 'villagers', 'current'), {
        status: 'collecting',
        submissions: [],
        featuredIds: [],
        sessionId
      });
      
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'villager-submit',
        status: 'collecting',
        sessionId
      });
    } catch (error) {
      console.error('Failed to launch villager submission:', error);
      alert(`Failed to launch villager submission: ${(error as Error).message}`);
    }
  };

  const closeVillagerSubmission = async () => {
    try {
      await updateDoc(doc(db, 'villagers', 'current'), {
        status: 'closed'
      });
      
      await updateDoc(doc(db, 'config', 'active-interaction'), {
        status: 'closed'
      });
    } catch (error) {
      console.error('Failed to close villager submission:', error);
    }
  };

  const displayVillagers = async () => {
    try {
      await updateDoc(doc(db, 'villagers', 'current'), {
        status: 'displaying'
      });
      
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'villager-submit',
        status: 'displaying'
      });
    } catch (error) {
      console.error('Failed to display villagers:', error);
    }
  };

  // Toggle villager approval status (approved <-> hidden)
  const toggleVillagerStatus = async (villager: Villager, newStatus: VillagerStatus) => {
    try {
      // Find and update the villager in the submissions array
      const updatedSubmissions = villagerSubmissions.map(v => {
        if (v.submittedBy === villager.submittedBy && v.submittedAt === villager.submittedAt) {
          return { ...v, status: newStatus };
        }
        return v;
      });
      
      await updateDoc(doc(db, 'villagers', 'current'), {
        submissions: updatedSubmissions
      });
    } catch (error) {
      console.error('Failed to update villager status:', error);
    }
  };

  // ============ MONSTER BUILDER FUNCTIONS (NEW - ALL PARTS AT ONCE) ============
  const activateMonsterBuilder = async () => {
    try {
      const sessionId = `builder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize monster builder state
      await setDoc(doc(db, 'monster-builder', 'current'), {
        status: 'building',
        submissions: {},
        results: {
          head: null,
          torso: null,
          arms: null,
          legs: null,
          counts: {
            head: {},
            torso: {},
            arms: {},
            legs: {}
          }
        },
        revealStep: 0,
        sessionId
      });
      
      // Set active interaction
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'monster-builder',
        status: 'building',
        sessionId
      });
    } catch (error) {
      console.error('Failed to launch monster builder:', error);
      alert(`Failed to launch monster builder: ${(error as Error).message}`);
    }
  };

  const closeMonsterBuilder = async () => {
    if (!monsterBuilderState) return;
    
    try {
      // Calculate winners for all parts
      const counts = monsterBuilderState.results.counts;
      const winners = {
        head: calculateWinner(counts.head || {}),
        torso: calculateWinner(counts.torso || {}),
        arms: calculateWinner(counts.arms || {}),
        legs: calculateWinner(counts.legs || {}),
      };

      await updateDoc(doc(db, 'monster-builder', 'current'), {
        status: 'closed',
        'results.head': winners.head,
        'results.torso': winners.torso,
        'results.arms': winners.arms,
        'results.legs': winners.legs,
      });
      
      await updateDoc(doc(db, 'config', 'active-interaction'), {
        status: 'closed'
      });
    } catch (error) {
      console.error('Failed to close monster builder:', error);
    }
  };

  const startMonsterBuilderReveal = async () => {
    try {
      await updateDoc(doc(db, 'monster-builder', 'current'), {
        status: 'revealing',
        revealStep: 1 // Start with head
      });
      
      await updateDoc(doc(db, 'config', 'active-interaction'), {
        status: 'revealing'
      });
    } catch (error) {
      console.error('Failed to start monster builder reveal:', error);
    }
  };

  const advanceBuilderReveal = async () => {
    if (!monsterBuilderState) return;
    
    const nextStep = (monsterBuilderState.revealStep + 1) as 1 | 2 | 3 | 4 | 5;
    
    try {
      await updateDoc(doc(db, 'monster-builder', 'current'), {
        revealStep: nextStep,
        status: nextStep === 5 ? 'complete' : 'revealing'
      });
      
      if (nextStep === 5) {
        await updateDoc(doc(db, 'config', 'active-interaction'), {
          status: 'complete'
        });
      }
    } catch (error) {
      console.error('Failed to advance builder reveal:', error);
    }
  };

  const resetMonsterBuilder = async () => {
    if (!confirm('Reset monster builder? This will clear all submissions.')) return;
    
    try {
      await setDoc(doc(db, 'monster-builder', 'current'), {
        status: 'building',
        submissions: {},
        results: {
          head: null,
          torso: null,
          arms: null,
          legs: null,
          counts: {
            head: {},
            torso: {},
            arms: {},
            legs: {}
          }
        },
        revealStep: 0,
        sessionId: `builder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'monster-builder',
        status: 'building'
      });
    } catch (error) {
      console.error('Failed to reset monster builder:', error);
    }
  };

  // Update vote option
  const updateOption = (index: number, field: keyof VoteOption, value: string) => {
    const newOptions = [...voteConfig.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setVoteConfig({ ...voteConfig, options: newOptions });
  };

  // Add third option
  const addOption = () => {
    if (voteConfig.options.length >= 3) return;
    setVoteConfig({
      ...voteConfig,
      options: [...voteConfig.options, { id: 'c', label: 'Option C', emoji: '🎭' }]
    });
  };

  // Remove option
  const removeOption = (index: number) => {
    if (voteConfig.options.length <= 2) return;
    const newOptions = voteConfig.options.filter((_, i) => i !== index);
    setVoteConfig({ ...voteConfig, options: newOptions });
  };

  if (!isAuthenticated) {
    const checking = authLoading || (user && isAdminLoading);
    return (
      <div className="admin-container">
        <div className="login-card">
          <h1>🎲 GM Portal</h1>
          {checking ? (
            <p>Checking your credentials…</p>
          ) : !user ? (
            <>
              <p>Sign in with your GM Google account to continue.</p>
              <button type="button" onClick={handleLogin}>
                Sign in with Google
              </button>
            </>
          ) : (
            <>
              <p>
                Signed in as <strong>{user.email}</strong>, but this email
                isn't on the admin allowlist.
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.75 }}>
                Add it to <code>config/admins.emails</code> in Firestore, or
                sign in with a different account.
              </p>
              <button type="button" onClick={handleLogout}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* ── Full-screen Ship Combat takeover ── */}
      {activeInteraction.type === 'ship-combat' && (
        <div className="ship-combat-fullscreen">
          <ShipCombatAdmin />
        </div>
      )}

      {/* ── Normal admin panel (hidden during ship combat) ── */}
      {activeInteraction.type !== 'ship-combat' && (<>
      <header className="admin-header">
        <h1>🎲 GM Control Panel</h1>
        {/* Compact Status Bar */}
        <div className="status-bar">
          <span className={`status-dot ${activeInteraction.type !== 'none' ? 'active' : ''}`} />
          <span className="status-text">
            {activeInteraction.type === 'none' && 'Idle'}
            {activeInteraction.type === 'vote' && `Vote ${activeInteraction.isOpen ? '🟢' : '🔴'}`}
            {activeInteraction.type === 'monster-builder' && `Builder ${monsterBuilderState?.status || ''}`}
            {activeInteraction.type === 'villager-submit' && `Villagers: ${villagerSubmissions.length}`}
          </span>
          {activeInteraction.type === 'vote' && <span className="status-count">{participantCount} votes</span>}
        </div>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      {/* Beast Name Banner - shows when we have winning parts */}
      {monsterBuilderState && (monsterBuilderState.status === 'closed' || monsterBuilderState.status === 'revealing' || monsterBuilderState.status === 'complete') && (
        <div className="beast-banner">
          <span className="beast-label">🐲</span>
          <span className="beast-name">
            {BUILDER_PART_ORDER.map(part => monsterBuilderState.results[part] || '').join('')}
          </span>
          <span className="beast-emojis">
            {BUILDER_PART_ORDER.map(part => {
              const winner = monsterBuilderState.results[part];
              if (!winner) return null;
              // Get emoji for this part
              const config = MONSTER_BUILDER_CONFIG.find(c => c.category === part);
              const emoji = config?.options.find(o => o.id === winner)?.emoji || '❓';
              return <span key={part} title={`${part}: ${winner}`}>{emoji}</span>;
            })}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="admin-tabs">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="tab-emoji">{tab.emoji}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-grid">
        {/* Quick Actions - only show when interaction active */}
        {activeInteraction.type !== 'none' && (
          <section className="admin-card actions-card quick-actions-inline">
            <div className="action-buttons-inline">
              {activeInteraction.type === 'vote' && (
                <>
                  {activeInteraction.isOpen ? (
                    <button onClick={closeVoting} className="btn-warning">🛑 Close</button>
                  ) : (
                    <button onClick={reopenVoting} className="btn-success">▶️ Reopen</button>
                  )}
                  <button onClick={resetVotes} className="btn-danger">🔄 Reset</button>
                </>
              )}
              <button onClick={endInteraction} className="btn-secondary">✖️ End</button>
            </div>
            {/* Inline vote counts */}
            {activeInteraction.type === 'vote' && activeInteraction.options && (
              <div className="vote-counts-inline">
                {activeInteraction.options.map(opt => (
                  <span key={opt.id} className="vote-count-chip">
                    {opt.emoji} {voteCounts[opt.id] || 0}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============ BEAST OF RIDGEFALL - PRIMARY CONTROLS ============ */}
        
        {/* Monster Builder */}
        {activeTab === 'monsters' && (
        <section className="admin-card config-card monster-builder-card">
          <h2>🐲 Monster Builder</h2>
          <p className="card-hint">Audience picks ALL 4 parts at once. Results aggregate. Dramatic reveal!</p>
          
          {/* Monster Builder Status */}
          {monsterBuilderState && (
            <div className="monster-builder-status">
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Status</span>
                  <span className={`status-value ${monsterBuilderState.status}`}>
                    {monsterBuilderState.status.toUpperCase()}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Submissions</span>
                  <span className="status-value">
                    {Object.keys(monsterBuilderState.submissions || {}).length}
                  </span>
                </div>
                {monsterBuilderState.status === 'revealing' && (
                  <div className="status-item">
                    <span className="status-label">Reveal Step</span>
                    <span className="status-value">
                      {monsterBuilderState.revealStep}/5
                    </span>
                  </div>
                )}
              </div>

              {/* Vote Counts Preview */}
              {monsterBuilderState.results.counts && (
                <div className="builder-counts">
                  <h4>Current Leaders:</h4>
                  <div className="counts-grid">
                    {BUILDER_PART_ORDER.map(part => {
                      const counts = monsterBuilderState.results.counts[part] || {};
                      const leader = calculateWinner(counts);
                      const leaderCount = counts[leader] || 0;
                      return (
                        <div key={part} className="count-item">
                          <span className="count-part">{part}:</span>
                          <span className="count-leader">
                            {leader ? `${leader} (${leaderCount})` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Winners (after closed) */}
              {(monsterBuilderState.status === 'closed' || monsterBuilderState.status === 'revealing' || monsterBuilderState.status === 'complete') && (
                <div className="builder-winners">
                  <h4>Winning Combo:</h4>
                  <div className="admin-winner-emojis">
                    {BUILDER_PART_ORDER.map(part => {
                      const winner = monsterBuilderState.results[part];
                      const config = MONSTER_BUILDER_CONFIG.find(c => c.category === part);
                      const emoji = config?.options.find(o => o.id === winner)?.emoji || '❓';
                      return (
                        <span key={part} className="admin-winner-emoji" title={`${part}: ${winner}`}>
                          {emoji}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Builder Controls */}
              <div className="builder-controls">
                {monsterBuilderState.status === 'building' && (
                  <button onClick={closeMonsterBuilder} className="btn-warning">
                    🛑 Close Submissions
                  </button>
                )}
                {monsterBuilderState.status === 'closed' && (
                  <button onClick={startMonsterBuilderReveal} className="btn-epic">
                    🎭 START REVEAL!
                  </button>
                )}
                {monsterBuilderState.status === 'revealing' && monsterBuilderState.revealStep < 5 && (
                  <button onClick={advanceBuilderReveal} className="btn-success">
                    ▶️ Next Part ({BUILDER_PART_ORDER[monsterBuilderState.revealStep] || 'Complete'})
                  </button>
                )}
                {(monsterBuilderState.status === 'revealing' || monsterBuilderState.status === 'complete') && (
                  <button onClick={endInteraction} className="btn-secondary">
                    ✖️ End
                  </button>
                )}
                <button onClick={resetMonsterBuilder} className="btn-danger">
                  🔄 Reset
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={activateMonsterBuilder} 
            className="btn-primary launch-btn"
            disabled={activeInteraction.type !== 'none'}
          >
            🐲 Open Monster Builder
          </button>
        </section>
        )}

        {/* Decoder Ring — Well of Lines */}
        {activeTab === 'decoder' && (
        <DecoderRingAdmin />
        )}

        {/* Ship Combat — Flyer Defense */}
        {activeTab === 'show' && (
        <ShipCombatAdmin />
        )}

        {/* Villager Submission Control */}
        {activeTab === 'villagers' && (
        <section className="admin-card config-card villager-card">
          <h2>🏘️ Villager Submissions</h2>
          <p className="card-hint">Audience creates NPCs with items. Some items are "hoard items"!</p>
          
          {/* Current Status */}
          {activeInteraction.type === 'villager-submit' && (
            <div className="villager-status">
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Submissions</span>
                  <span className="status-value">{villagerSubmissions.length}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Hoard Items</span>
                  <span className="status-value hoard">
                    {villagerSubmissions.filter(v => v.isHoardItem).length}
                  </span>
                </div>
              </div>

              {/* Villager Controls */}
              <div className="villager-controls">
                {villagerStatus === 'collecting' && (
                  <button onClick={closeVillagerSubmission} className="btn-warning">
                    🛑 Close Submissions
                  </button>
                )}
                {villagerStatus === 'closed' && (
                  <button onClick={displayVillagers} className="btn-success">
                    📺 Show on Stream
                  </button>
                )}
                <button onClick={endInteraction} className="btn-secondary">
                  ✖️ End
                </button>
              </div>
            </div>
          )}

          {/* Submissions List - Enhanced for GM reading */}
          {villagerSubmissions.length > 0 && (
            <div className="submissions-list">
              <h4>Villagers ({villagerSubmissions.filter(v => v.status !== 'hidden').length} approved, {villagerSubmissions.filter(v => v.status === 'hidden').length} hidden)</h4>
              
              {/* Approved Villagers */}
              <div className="submissions-scroll">
                {villagerSubmissions
                  .filter(v => v.status !== 'hidden')
                  .map((v) => {
                    const item = getItemById(v.item);
                    const pronounLabel = PRONOUNS_OPTIONS.find(p => p.id === v.pronouns)?.label || v.pronouns;
                    return (
                      <div 
                        key={`${v.submittedBy}-${v.submittedAt}`}
                        className={`npc-card ${v.isHoardItem ? 'hoard' : ''}`}
                      >
                        <div className="npc-card-header">
                          <span className="npc-name">"{v.name}"</span>
                          <span className="npc-pronouns">({pronounLabel})</span>
                          <div className="npc-actions">
                            <button 
                              className="btn-icon btn-hide" 
                              onClick={() => toggleVillagerStatus(v, 'hidden')}
                              title="Hide this NPC"
                            >
                              ✗
                            </button>
                          </div>
                        </div>
                        <div className="npc-card-details">
                          <span className="npc-species-bg">{v.species} {v.background}</span>
                          <span className="npc-item">
                            {item?.emoji || '📦'} {v.itemName}
                            {v.isHoardItem && <span className="hoard-badge">⭐ Hoard</span>}
                          </span>
                        </div>
                        {v.quirk && (
                          <p className="npc-quirk">"{v.quirk}"</p>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {/* Hidden Villagers (Collapsed) */}
              {villagerSubmissions.filter(v => v.status === 'hidden').length > 0 && (
                <div className="hidden-section">
                  <button 
                    className="hidden-toggle"
                    onClick={() => setShowHiddenVillagers(!showHiddenVillagers)}
                  >
                    {showHiddenVillagers ? '▼' : '▶'} Hidden ({villagerSubmissions.filter(v => v.status === 'hidden').length})
                  </button>
                  
                  {showHiddenVillagers && (
                    <div className="hidden-list">
                      {villagerSubmissions
                        .filter(v => v.status === 'hidden')
                        .map((v) => (
                          <div 
                            key={`${v.submittedBy}-${v.submittedAt}`}
                            className="npc-card hidden"
                          >
                            <div className="npc-card-header">
                              <span className="npc-name">"{v.name}"</span>
                              <div className="npc-actions">
                                <button 
                                  className="btn-icon btn-restore" 
                                  onClick={() => toggleVillagerStatus(v, 'approved')}
                                  title="Restore this NPC"
                                >
                                  ✓
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button 
            onClick={activateVillagerSubmission} 
            className="btn-primary launch-btn"
            disabled={activeInteraction.type !== 'none'}
          >
            🏘️ Open Villager Submissions
          </button>
        </section>
        )}

        {/* ============ BETAWAVE TAPES - NPC REVIEW ============ */}
        {activeTab === 'npcs' && (
        <section className="admin-card config-card admin-card--full">
          <h2>📋 Betawave NPC Review</h2>
          <NPCReviewPanel showId="betawave-last-call-2026-04-18" />
        </section>
        )}

        {/* ============ UTILITY FEATURES (Show Controls tab) ============ */}

        {/* Vote Configuration */}
        {activeTab === 'show' && (
        <section className="admin-card config-card">
          <h2>Configure Voting</h2>
          
          <div className="form-group">
            <label>Question</label>
            <input
              type="text"
              value={voteConfig.question}
              onChange={(e) => setVoteConfig({ ...voteConfig, question: e.target.value })}
              placeholder="What should the party do?"
            />
          </div>

          <div className="form-group">
            <label>Timer (seconds)</label>
            <input
              type="number"
              value={voteConfig.timer}
              onChange={(e) => setVoteConfig({ ...voteConfig, timer: parseInt(e.target.value) || 60 })}
              min="10"
              max="300"
            />
          </div>

          <div className="options-config">
            <label>Options ({voteConfig.options.length}/3)</label>
            {voteConfig.options.map((opt, i) => (
              <div key={i} className="option-row">
                <input
                  type="text"
                  value={opt.emoji}
                  onChange={(e) => updateOption(i, 'emoji', e.target.value)}
                  className="emoji-input"
                  placeholder="🎭"
                />
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(i, 'label', e.target.value)}
                  placeholder="Option label"
                />
                {voteConfig.options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="remove-btn">✕</button>
                )}
              </div>
            ))}
            {voteConfig.options.length < 3 && (
              <button onClick={addOption} className="add-option-btn">
                + Add Third Option
              </button>
            )}
          </div>

          <button 
            onClick={activateVoting} 
            className="btn-primary launch-btn"
            disabled={activeInteraction.type !== 'none'}
          >
            🚀 Launch Voting
          </button>
          {activeInteraction.type !== 'none' && (
            <p className="hint">End current interaction first</p>
          )}
        </section>
        )}

        {/* Show Selector — Phase 3b: writes config/platform.currentShowId.
            ShowProvider reads this and exposes it via useShow() everywhere.
            Phase 3c will start stamping showId onto vote/group-roll writes. */}
        {activeTab === 'show' && (
        <section className="admin-card theme-card">
          <h2>🎬 Active Show</h2>
          <p className="theme-hint">
            Selects which show this platform is currently running. Affects which
            interactions and theme are shown to the audience.
          </p>
          <div className="theme-options">
            {allShows.map((s) => (
              <button
                key={s.id}
                className={`theme-btn ${activeShowId === s.id ? 'active' : ''}`}
                onClick={async () => {
                  try {
                    await setCurrentShow(s.id);
                  } catch (err) {
                    console.error('setCurrentShow failed:', err);
                  }
                }}
                disabled={s.status === 'archived'}
              >
                <span className="theme-name">
                  {s.name}
                  {s.status === 'draft' ? ' (draft)' : ''}
                </span>
                <span className="theme-desc">
                  {s.description ?? `${s.themeId} · ${s.systemId}`}
                </span>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Theme Switcher */}
        {activeTab === 'show' && (
        <section className="admin-card theme-card">
          <h2>🎨 Show Theme</h2>
          <p className="theme-hint">Changes apply to all connected audiences instantly</p>
          <div className="theme-options">
            {Object.values(themeRegistry).map((t) => (
              <button
                key={t.id}
                className={`theme-btn ${themeId === t.id ? 'active' : ''}`}
                onClick={async () => {
                  setThemeId(t.id as ThemeId);
                  await setDoc(doc(db, 'config', 'theme'), { themeId: t.id });
                }}
              >
                <span className="theme-name">{t.name}</span>
                <span className="theme-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* 🎵 AWESOME MIX CUE SYSTEM */}
        {activeTab === 'show' && (
        <section className="admin-card cue-card">
          <h2>🎵 Awesome Mix - Live Cues</h2>
          <p className="theme-hint">Manual effect triggers for dramatic moments</p>
          
          <div className="cue-grid">
            {/* Sound Effects */}
            <div className="cue-group">
              <h3>🔊 Sound FX</h3>
              <div className="cue-buttons">
                <button 
                  className="cue-btn sfx"
                  onClick={() => broadcastCue('sound-effect', { soundKey: 'victory' })}
                  title="Victory fanfare"
                >
                  🏆 Victory
                </button>
                <button 
                  className="cue-btn sfx"
                  onClick={() => broadcastCue('sound-effect', { soundKey: 'error' })}
                  title="Failure sound"
                >
                  💀 Fail
                </button>
                <button 
                  className="cue-btn sfx"
                  onClick={() => broadcastCue('sound-effect', { soundKey: 'whoosh' })}
                  title="Transition swoosh"
                >
                  💨 Whoosh
                </button>
                <button 
                  className="cue-btn sfx"
                  onClick={() => broadcastCue('sound-effect', { soundKey: 'diceRoll' })}
                  title="Dice rolling sound"
                >
                  🎲 Dice
                </button>
              </div>
            </div>

            {/* Battle Music */}
            <div className="cue-group">
              <h3>⚔️ Battle Mode</h3>
              <div className="music-track-select">
                <label>Track:</label>
                <select 
                  value={selectedBattle} 
                  onChange={(e) => switchBattleTrack(e.target.value)}
                >
                  <option value="combat">⚔️ Combat</option>
                  <option value="boss">👹 Boss Fight</option>
                  <option value="tension">😰 Tension</option>
                </select>
              </div>
              <div className="cue-buttons">
                <button 
                  className={`cue-btn battle ${isBattleMusicPlaying ? 'active' : ''}`}
                  onClick={() => broadcastBattle(!isBattleMusicPlaying)}
                >
                  {isBattleMusicPlaying ? '🛑 End Combat' : '⚔️ Start Combat!'}
                </button>
              </div>
              <small className="cue-hint">
                {isBattleMusicPlaying ? 'Battle music playing... (synced to all displays)' : 'Triggers battle music + visual intensity on ALL displays'}
              </small>
            </div>

            {/* Ambient Music */}
            <div className="cue-group">
              <h3>🌊 Ambient Music</h3>
              <div className="music-track-select">
                <label>Track:</label>
                <select 
                  value={selectedAmbient} 
                  onChange={(e) => switchAmbientTrack(e.target.value)}
                >
                  <option value="village">🏘️ Village</option>
                  <option value="tavern">🍺 Tavern</option>
                  <option value="forest">🌲 Forest</option>
                  <option value="mystery">🔮 Mystery</option>
                </select>
              </div>
              <div className="cue-buttons">
                <button 
                  className={`cue-btn ambient ${isAmbientPlaying ? 'active' : ''}`}
                  onClick={() => broadcastAmbient(!isAmbientPlaying, selectedAmbient)}
                  title={isAmbientPlaying ? 'Stop ambient' : 'Start ambient loop on all displays'}
                >
                  {isAmbientPlaying ? '⏹️ Stop Ambient' : '▶️ Start Ambient'}
                </button>
              </div>
              <small className="cue-hint">
                {isAmbientPlaying ? `Playing: ${selectedAmbient}` : 'Ambient music syncs to all displays'}
              </small>
            </div>

            {/* Celebrations */}
            <div className="cue-group">
              <h3>🎉 Celebrations</h3>
              <div className="cue-buttons">
                <button 
                  className="cue-btn celebration"
                  onClick={() => broadcastCelebration('quick')}
                  title="Small confetti burst (all displays)"
                >
                  ✨ Quick
                </button>
                <button 
                  className="cue-btn celebration epic"
                  onClick={() => broadcastCelebration('winner')}
                  title="Winner reveal celebration (all displays)"
                >
                  🏆 Winner
                </button>
                <button 
                  className="cue-btn celebration legendary"
                  onClick={() => broadcastCelebration('fireworks')}
                  title="Full fireworks display (all displays)"
                >
                  🎆 Fireworks
                </button>
              </div>
            </div>

            {/* Screen Effects */}
            <div className="cue-group">
              <h3>📺 Screen FX</h3>
              <div className="cue-buttons">
                <button 
                  className="cue-btn screen"
                  onClick={() => broadcastShake('light')}
                >
                  Shake (Light)
                </button>
                <button 
                  className="cue-btn screen"
                  onClick={() => broadcastShake('heavy')}
                >
                  Shake (Heavy)
                </button>
                <button 
                  className="cue-btn screen danger"
                  onClick={() => broadcastShake('earthquake')}
                >
                  🌋 EARTHQUAKE
                </button>
              </div>
            </div>

            {/* Audio Test */}
            <div className="cue-group">
              <h3>🔧 Audio Test</h3>
              <div className="cue-buttons">
                <button 
                  className="cue-btn test"
                  onClick={() => {
                    audioMixer.init();
                    playSound('uiClick');
                  }}
                  title="Initialize audio (required for first interaction)"
                >
                  🔓 Unlock Audio
                </button>
                <button 
                  className="cue-btn test"
                  onClick={() => audioMixer.toggleMute()}
                >
                  🔇 Toggle Mute
                </button>
              </div>
              <small className="cue-hint">
                Click "Unlock Audio" once to enable sounds (browser requirement)
              </small>
            </div>
          </div>
        </section>
        )}

        {/* Madlibs Config */}
        {activeTab === 'show' && (
        <section className="admin-card config-card">
          <h2>📝 Madlibs D&D</h2>
          <div className="form-group">
            <label>Template</label>
            <textarea
              value={madlibsConfig.template}
              onChange={(e) => setMadlibsConfig({ ...madlibsConfig, template: e.target.value })}
              placeholder="The [ADJECTIVE] wizard casts [SPELL]..."
              rows={3}
            />
            <small>Use [ADJECTIVE], [NOUN], [VERB], [CREATURE], [SPELL], etc.</small>
          </div>
          <button 
            onClick={activateMadlibs} 
            className="btn-primary"
            disabled={activeInteraction.type !== 'none'}
          >
            🚀 Launch Madlibs
          </button>
        </section>
        )}



        {/* Group Roll Config */}
        {activeTab === 'show' && (
        <section className="admin-card config-card">
          <h2>🎲 Group Roll</h2>
          <div className="form-group">
            <label>Prompt</label>
            <input
              type="text"
              value={rollConfig.prompt}
              onChange={(e) => setRollConfig({ ...rollConfig, prompt: e.target.value })}
              placeholder="Stealth check!"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Dice</label>
              <select
                value={rollConfig.diceType}
                onChange={(e) => setRollConfig({ ...rollConfig, diceType: e.target.value })}
              >
                <option value="d20">d20</option>
                <option value="d12">d12</option>
                <option value="d10">d10</option>
                <option value="d8">d8</option>
                <option value="d6">d6</option>
                <option value="d4">d4</option>
              </select>
            </div>
            <div className="form-group">
              <label>DC</label>
              <input
                type="number"
                value={rollConfig.dc}
                onChange={(e) => setRollConfig({ ...rollConfig, dc: parseInt(e.target.value) || 10 })}
                min="1"
                max="30"
              />
            </div>
            <div className="form-group">
              <label>Modifier</label>
              <input
                type="number"
                value={rollConfig.modifier}
                onChange={(e) => setRollConfig({ ...rollConfig, modifier: parseInt(e.target.value) || 0 })}
                min="-10"
                max="10"
              />
            </div>
          </div>
          <button 
            onClick={activateGroupRoll} 
            className="btn-primary"
            disabled={activeInteraction.type !== 'none'}
          >
            🚀 Launch Group Roll
          </button>
        </section>
        )}

      </div>
      </>)}
    </div>
  );
}