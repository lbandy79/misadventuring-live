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

        {/* Future: Other interaction types */}
        <section className="admin-card coming-soon-card">
          <h2>Coming Soon</h2>
          <ul>
            <li>📝 Madlibs D&D</li>
            <li>🏷️ NPC Naming</li>
            <li>🎲 Group Rolls</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
