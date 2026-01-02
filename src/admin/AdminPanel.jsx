import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useTheme } from '../ThemeContext'
import themes from '../themes'
import './AdminPanel.css'

const ADMIN_PASSWORD = 'misadventure2025' // Change this! Or move to env var later

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeInteraction, setActiveInteraction] = useState({ type: 'none' })
  const [voteConfig, setVoteConfig] = useState({
    question: 'What should the party do?',
    options: [
      { id: 'a', label: 'Fight', emoji: '⚔️' },
      { id: 'b', label: 'Flee', emoji: '🏃' }
    ],
    isOpen: false,
    timer: 60
  })
  const [madlibsConfig, setMadlibsConfig] = useState({
    template: 'The [ADJECTIVE] wizard casts [SPELL] at the [CREATURE]!',
  })
  const [npcConfig, setNpcConfig] = useState({
    description: 'A mysterious tavern keeper with a scar across their face',
    selectionMode: 'random'
  })
  const [rollConfig, setRollConfig] = useState({
    prompt: 'Stealth check to sneak past the guards!',
    diceType: 'd20',
    dc: 15,
    modifier: 0
  })
  const [voteCounts, setVoteCounts] = useState({})
  const [participantCount, setParticipantCount] = useState(0)
  const { themeId, setThemeId } = useTheme()

  // Check session storage for existing auth
  useEffect(() => {
    const auth = sessionStorage.getItem('mtp-admin-auth')
    if (auth === 'true') setIsAuthenticated(true)
  }, [])

  // Listen to active interaction
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubscribe = onSnapshot(
      doc(db, 'config', 'active-interaction'),
      (snapshot) => {
        if (snapshot.exists()) {
          setActiveInteraction(snapshot.data())
        }
      }
    )

    return () => unsubscribe()
  }, [isAuthenticated])

  // Listen to vote counts
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubscribe = onSnapshot(
      doc(db, 'votes', 'current-vote'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setVoteCounts(data.counts || {})
          setParticipantCount(data.totalVotes || 0)
        } else {
          setVoteCounts({})
          setParticipantCount(0)
        }
      }
    )

    return () => unsubscribe()
  }, [isAuthenticated])

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('mtp-admin-auth', 'true')
    } else {
      alert('Wrong password, adventurer!')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('mtp-admin-auth')
  }

  // Activate voting
  const activateVoting = async () => {
    try {
      console.log('Attempting to launch voting...')
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'vote',
        question: voteConfig.question,
        options: voteConfig.options,
        isOpen: true,
        timer: voteConfig.timer,
        startedAt: Date.now()
      })
      console.log('active-interaction written successfully')

      // Initialize vote counts
      const initialCounts = {}
      voteConfig.options.forEach(opt => {
        initialCounts[opt.id] = 0
      })
      await setDoc(doc(db, 'votes', 'current-vote'), {
        counts: initialCounts,
        totalVotes: 0
      })
      console.log('votes/current-vote written successfully')
    } catch (error) {
      console.error('Failed to launch voting:', error)
      alert(`Failed to launch voting: ${error.message}`)
    }
  }

  // Close voting (keep results visible)
  const closeVoting = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), {
      ...activeInteraction,
      isOpen: false
    })
  }

  // Reopen voting
  const reopenVoting = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), {
      ...activeInteraction,
      isOpen: true
    })
  }

  // End interaction entirely
  const endInteraction = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), {
      type: 'none'
    })
  }

  // Reset all votes
  const resetVotes = async () => {
    if (!confirm('Reset all votes? This cannot be undone.')) return
    
    const initialCounts = {}
    activeInteraction.options?.forEach(opt => {
      initialCounts[opt.id] = 0
    })
    await setDoc(doc(db, 'votes', 'current-vote'), {
      counts: initialCounts,
      totalVotes: 0
    })
  }

  // ============ MADLIBS FUNCTIONS ============
  const activateMadlibs = async () => {
    try {
      // Parse template for blanks
      const blanks = [...madlibsConfig.template.matchAll(/\[([A-Z_]+)\]/g)].map(m => m[1])
      
      const submissions = {}
      blanks.forEach(b => { submissions[b] = [] })
      
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'madlibs'
      })
      
      await setDoc(doc(db, 'madlibs', 'current'), {
        template: madlibsConfig.template,
        blanks,
        currentBlankIndex: 0,
        submissions,
        winners: {},
        status: 'collecting'
      })
    } catch (error) {
      console.error('Failed to launch madlibs:', error)
      alert(`Failed to launch madlibs: ${error.message}`)
    }
  }

  const advanceMadlibsBlank = async () => {
    // Move to next blank or complete
    const currentIndex = activeInteraction.currentBlankIndex || 0
    const madlibDoc = await getDocs(collection(db, 'madlibs'))
    // For now, just increment - we'd need to read the current doc properly
    await setDoc(doc(db, 'madlibs', 'current'), {
      ...activeInteraction,
      currentBlankIndex: currentIndex + 1
    }, { merge: true })
  }

  // ============ NPC NAMING FUNCTIONS ============
  const activateNpcNaming = async () => {
    try {
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'npc-naming'
      })
      
      await setDoc(doc(db, 'npc-naming', 'current'), {
        description: npcConfig.description,
        imageUrl: npcConfig.imageUrl || null,
        submissions: [],
        winner: null,
        status: 'collecting',
        selectionMode: npcConfig.selectionMode
      })
    } catch (error) {
      console.error('Failed to launch NPC naming:', error)
      alert(`Failed to launch NPC naming: ${error.message}`)
    }
  }

  const pickNpcWinner = async (mode = 'random') => {
    // Read current submissions and pick winner
    const docSnap = await getDocs(collection(db, 'npc-naming'))
    // Simplified - pick random from submissions
    await setDoc(doc(db, 'npc-naming', 'current'), {
      status: 'revealing'
    }, { merge: true })
  }

  // ============ GROUP ROLL FUNCTIONS ============
  const activateGroupRoll = async () => {
    try {
      await setDoc(doc(db, 'config', 'active-interaction'), {
        type: 'group-roll'
      })
      
      await setDoc(doc(db, 'group-roll', 'current'), {
        prompt: rollConfig.prompt,
        diceType: rollConfig.diceType,
        dc: rollConfig.dc,
        modifier: rollConfig.modifier,
        rolls: [],
        status: 'rolling'
      })
    } catch (error) {
      console.error('Failed to launch group roll:', error)
      alert(`Failed to launch group roll: ${error.message}`)
    }
  }

  const showRollResults = async () => {
    await setDoc(doc(db, 'group-roll', 'current'), {
      status: 'results'
    }, { merge: true })
  }

  // Update vote option
  const updateOption = (index, field, value) => {
    const newOptions = [...voteConfig.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setVoteConfig({ ...voteConfig, options: newOptions })
  }

  // Add third option
  const addOption = () => {
    if (voteConfig.options.length >= 3) return
    setVoteConfig({
      ...voteConfig,
      options: [...voteConfig.options, { id: 'c', label: 'Option C', emoji: '🎭' }]
    })
  }

  // Remove option
  const removeOption = (index) => {
    if (voteConfig.options.length <= 2) return
    const newOptions = voteConfig.options.filter((_, i) => i !== index)
    setVoteConfig({ ...voteConfig, options: newOptions })
  }

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
    )
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
            {Object.values(themes).map((t) => (
              <button
                key={t.id}
                className={`theme-btn ${themeId === t.id ? 'active' : ''}`}
                onClick={async () => {
                  setThemeId(t.id)
                  await setDoc(doc(db, 'config', 'theme'), { themeId: t.id })
                }}
              >
                <span className="theme-name">{t.name}</span>
                <span className="theme-desc">{t.description}</span>
              </button>
            ))}
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
  )
}
