import { useState, useEffect, type FormEvent } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme, themeRegistry } from '../themes';
import type { ThemeId } from '../themes';
import { useAwesomeMix, broadcastCue } from '../hooks';
import './AdminPanel.css';

const ADMIN_PASSWORD = 'misadventure2025'; // Change this! Or move to env var later

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

interface NpcConfig {
  description: string;
  imageUrl?: string;
  selectionMode: string;
}

interface RollConfig {
  prompt: string;
  diceType: string;
  dc: number;
  modifier: number;
}

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'npc-naming' | 'group-roll';
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  currentBlankIndex?: number;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
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
  const [npcConfig, setNpcConfig] = useState<NpcConfig>({
    description: 'A mysterious tavern keeper with a scar across their face',
    selectionMode: 'random'
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
  const { themeId, setThemeId } = useTheme();
  
  // Awesome Mix hook for sound/effects (local preview - displays get effects via Firebase)
  const {
    playSound,
    startAmbient,
    stopAmbient,
    shakeScreen,
    triggerCelebration,
    enterBattleMode,
    exitBattleMode,
    audioMixer,
  } = useAwesomeMix();

  // Broadcast helpers - trigger locally AND send to all displays
  const broadcastBattle = (start: boolean) => {
    if (start) {
      enterBattleMode();
      setIsBattleMusicPlaying(true);
    } else {
      exitBattleMode();
      setIsBattleMusicPlaying(false);
    }
    broadcastCue(start ? 'battle-start' : 'battle-end');
  };

  const broadcastCelebration = (type: 'quick' | 'winner' | 'fireworks') => {
    triggerCelebration(type);
    broadcastCue(`celebration-${type}` as 'celebration-quick' | 'celebration-winner' | 'celebration-fireworks');
  };

  const broadcastShake = (intensity: 'light' | 'heavy' | 'earthquake') => {
    shakeScreen({ intensity: intensity === 'light' ? 'subtle' : intensity });
    broadcastCue(`shake-${intensity}` as 'shake-light' | 'shake-heavy' | 'shake-earthquake');
  };

  const broadcastAmbient = (start: boolean) => {
    if (start) {
      startAmbient();
    } else {
      stopAmbient();
    }
    broadcastCue(start ? 'ambient-start' : 'ambient-stop');
  };

  // Check session storage for existing auth
  useEffect(() => {
    const auth = sessionStorage.getItem('mtp-admin-auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

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

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('mtp-admin-auth', 'true');
    } else {
      alert('Wrong password, adventurer!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mtp-admin-auth');
  };

  // Activate voting
  const activateVoting = async () => {
    try {
      console.log('Attempting to launch voting...');
      const sessionId = `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'vote',
        question: voteConfig.question,
        options: voteConfig.options,
        isOpen: true,
        timer: voteConfig.timer,
        startedAt: Date.now(),
        sessionId // Unique ID for this voting round
      });
      console.log('active-interaction written successfully');

      // Initialize vote counts
      const initialCounts: Record<string, number> = {};
      voteConfig.options.forEach(opt => {
        initialCounts[opt.id] = 0;
      });
      await setDoc(doc(db, 'votes', 'current-vote'), {
        counts: initialCounts,
        totalVotes: 0
      });
      console.log('votes/current-vote written successfully');
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
    
    const newSessionId = `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const initialCounts: Record<string, number> = {};
    activeInteraction.options?.forEach(opt => {
      initialCounts[opt.id] = 0;
    });
    
    // Update both the session ID (to invalidate previous votes) and reset counts
    await setDoc(doc(db, 'config', 'active-interaction'), {
      ...activeInteraction,
      sessionId: newSessionId,
      startedAt: Date.now() // Also reset timer
    });
    
    await setDoc(doc(db, 'votes', 'current-vote'), {
      counts: initialCounts,
      totalVotes: 0
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

  // ============ NPC NAMING FUNCTIONS ============
  const activateNpcNaming = async () => {
    try {
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'npc-naming'
      });
      
      await setDoc(doc(db, 'npc-naming', 'current'), {
        description: npcConfig.description,
        imageUrl: npcConfig.imageUrl || null,
        submissions: [],
        winner: null,
        status: 'collecting',
        selectionMode: npcConfig.selectionMode
      });
    } catch (error) {
      console.error('Failed to launch NPC naming:', error);
      alert(`Failed to launch NPC naming: ${(error as Error).message}`);
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
    return (
      <div className="admin-container">
        <div className="login-card">
          <h1>🎲 GM Portal</h1>
          <p>Enter the secret phrase to continue</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
            />
            <button type="submit">Enter the Tavern</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>🎲 GM Control Panel</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="admin-grid">
        {/* Status Card */}
        <section className="admin-card status-card">
          <h2>Current Status</h2>
          <div className="status-indicator">
            <span className={`status-dot ${activeInteraction.type !== 'none' ? 'active' : ''}`} />
            <span>
              {activeInteraction.type === 'none' && 'No active interaction'}
              {activeInteraction.type === 'vote' && `Voting: ${activeInteraction.isOpen ? 'OPEN' : 'CLOSED'}`}
            </span>
          </div>
          {activeInteraction.type === 'vote' && (
            <div className="live-stats">
              <p><strong>{participantCount}</strong> votes cast</p>
              <div className="vote-breakdown">
                {activeInteraction.options?.map(opt => (
                  <div key={opt.id} className="vote-stat">
                    <span>{opt.emoji} {opt.label}</span>
                    <span>{voteCounts[opt.id] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        {activeInteraction.type !== 'none' && (
          <section className="admin-card actions-card">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              {activeInteraction.isOpen ? (
                <button onClick={closeVoting} className="btn-warning">
                  🛑 Close Voting
                </button>
              ) : (
                <button onClick={reopenVoting} className="btn-success">
                  ▶️ Reopen Voting
                </button>
              )}
              <button onClick={resetVotes} className="btn-danger">
                🔄 Reset Votes
              </button>
              <button onClick={endInteraction} className="btn-secondary">
                ✖️ End Interaction
              </button>
            </div>
          </section>
        )}

        {/* Vote Configuration */}
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

        {/* Theme Switcher */}
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

        {/* 🎵 AWESOME MIX CUE SYSTEM */}
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
                  onClick={() => playSound('victory')}
                  title="Victory fanfare"
                >
                  🏆 Victory
                </button>
                <button 
                  className="cue-btn sfx"
                  onClick={() => playSound('error')}
                  title="Failure sound"
                >
                  💀 Fail
                </button>
                <button 
                  className="cue-btn sfx"
                  onClick={() => playSound('whoosh')}
                  title="Transition swoosh"
                >
                  💨 Whoosh
                </button>
                <button 
                  className="cue-btn sfx"
                  onClick={() => playSound('diceRoll')}
                  title="Dice rolling sound"
                >
                  🎲 Dice
                </button>
              </div>
            </div>

            {/* Battle Music */}
            <div className="cue-group">
              <h3>⚔️ Battle Mode</h3>
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

            {/* Ambient */}
            <div className="cue-group">
              <h3>🌊 Ambient</h3>
              <div className="cue-buttons">
                <button 
                  className="cue-btn ambient"
                  onClick={() => broadcastAmbient(true)}
                  title="Start ambient loop on all displays"
                >
                  ▶️ Start Ambient
                </button>
                <button 
                  className="cue-btn ambient"
                  onClick={() => broadcastAmbient(false)}
                  title="Stop ambient loop on all displays"
                >
                  ⏹️ Stop
                </button>
              </div>
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

        {/* Madlibs Config */}
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

        {/* NPC Naming Config */}
        <section className="admin-card config-card">
          <h2>🧙 NPC Naming</h2>
          <div className="form-group">
            <label>NPC Description</label>
            <textarea
              value={npcConfig.description}
              onChange={(e) => setNpcConfig({ ...npcConfig, description: e.target.value })}
              placeholder="A mysterious tavern keeper..."
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Selection Mode</label>
            <select
              value={npcConfig.selectionMode}
              onChange={(e) => setNpcConfig({ ...npcConfig, selectionMode: e.target.value })}
            >
              <option value="random">Random Pick</option>
              <option value="vote">Audience Vote</option>
              <option value="gm-pick">GM Picks</option>
            </select>
          </div>
          <button 
            onClick={activateNpcNaming} 
            className="btn-primary"
            disabled={activeInteraction.type !== 'none'}
          >
            🚀 Launch NPC Naming
          </button>
        </section>

        {/* Group Roll Config */}
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
      </div>
    </div>
  );
}
