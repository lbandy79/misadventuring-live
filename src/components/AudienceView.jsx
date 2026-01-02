import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import EncounterVote from './EncounterVote'
import Madlibs from './Madlibs'
import NpcNaming from './NpcNaming'
import GroupRoll from './GroupRoll'
import './AudienceView.css'

export default function AudienceView() {
  const [activeInteraction, setActiveInteraction] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    let unsubscribe

    try {
      unsubscribe = onSnapshot(
        doc(db, 'config', 'active-interaction'),
        (snapshot) => {
          if (snapshot.exists()) {
            setActiveInteraction(snapshot.data())
          } else {
            setActiveInteraction({ type: 'none' })
          }
          setIsLoading(false)
          setConnectionError(false)
        },
        (error) => {
          console.error('Firebase connection error:', error)
          setConnectionError(true)
          setIsLoading(false)
        }
      )
    } catch (error) {
      console.error('Firebase setup error:', error)
      setConnectionError(true)
      setIsLoading(false)
    }

    return () => unsubscribe && unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="audience-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Connecting to the adventure...</p>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="audience-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Connection Lost</h2>
          <p>Having trouble reaching the server. Check your connection and refresh.</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="audience-container">
      <header className="show-header">
        <h1>The Misadventuring Party</h1>
        <p className="tagline">Live Audience Interaction</p>
      </header>

      <main className="interaction-area">
        {activeInteraction?.type === 'vote' && (
          <EncounterVote config={activeInteraction} />
        )}

        {activeInteraction?.type === 'none' && (
          <div className="waiting-state">
            <span className="waiting-icon">🎲</span>
            <h2>The Adventure Continues...</h2>
            <p>Stand by for your moment to influence the story!</p>
          </div>
        )}

        {/* Future interaction types will plug in here */}
        {activeInteraction?.type === 'madlibs' && (
          <Madlibs />
        )}
        {activeInteraction?.type === 'npc-naming' && (
          <NpcNaming />
        )}
        {activeInteraction?.type === 'group-roll' && (
          <GroupRoll />
        )}
      </main>
    </div>
  )
}
