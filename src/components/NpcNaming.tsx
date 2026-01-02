import { useState, useEffect, type KeyboardEvent } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion } from 'framer-motion';
import './NpcNaming.css';

interface NpcSubmission {
  name: string;
  userId: string;
  votes: number;
  timestamp: number;
}

interface NpcData {
  description: string;
  imageUrl?: string | null;
  submissions: NpcSubmission[];
  winner: string | null;
  status: 'collecting' | 'voting' | 'revealing' | 'idle';
  selectionMode: 'random' | 'vote' | 'gm-pick';
}

interface NpcNamingProps {
  isAdmin?: boolean;
}

export default function NpcNaming({ isAdmin: _isAdmin = false }: NpcNamingProps) {
  const [npcData, setNpcData] = useState<NpcData | null>(null);
  const [submission, setSubmission] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userId] = useState(() => localStorage.getItem('audience-id') || Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    localStorage.setItem('audience-id', userId);
    
    const unsubscribe = onSnapshot(doc(db, 'npc-naming', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as NpcData;
        setNpcData(data);
        
        // Check if user already submitted
        const userSubmission = data.submissions?.find(s => s.userId === userId);
        setHasSubmitted(!!userSubmission);
      } else {
        setNpcData(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const submitName = async () => {
    if (!submission.trim() || !npcData) return;
    
    try {
      await updateDoc(doc(db, 'npc-naming', 'current'), {
        submissions: arrayUnion({
          name: submission.trim(),
          userId,
          votes: 0,
          timestamp: Date.now()
        })
      });
      setHasSubmitted(true);
    } catch (error) {
      console.error('Failed to submit name:', error);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitName();
  };

  const voteForName = async (submissionIndex: number) => {
    if (hasVoted || !npcData) return;
    
    try {
      const updatedSubmissions = [...npcData.submissions];
      updatedSubmissions[submissionIndex].votes += 1;
      
      await updateDoc(doc(db, 'npc-naming', 'current'), {
        submissions: updatedSubmissions
      });
      setHasVoted(true);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  // Idle state
  if (!npcData || npcData.status === 'idle') {
    return (
      <div className="npc-naming-container idle">
        <div className="waiting-icon">🧙</div>
        <h2>NPC Naming</h2>
        <p>Waiting for a character to name...</p>
      </div>
    );
  }

  // Collecting name submissions
  if (npcData.status === 'collecting') {
    return (
      <div className="npc-naming-container collecting">
        <h2>Name This NPC!</h2>
        
        {npcData.imageUrl && (
          <div className="npc-portrait">
            <img src={npcData.imageUrl} alt="NPC" />
          </div>
        )}
        
        <div className="npc-description">
          {npcData.description}
        </div>

        {!hasSubmitted ? (
          <div className="submission-form">
            <input
              type="text"
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Enter a name..."
              maxLength={40}
              onKeyPress={handleKeyPress}
            />
            <button onClick={submitName} disabled={!submission.trim()}>
              Submit
            </button>
          </div>
        ) : (
          <div className="submitted-message">
            <span>✓</span> Name submitted!
          </div>
        )}

        <div className="submission-count">
          {npcData.submissions?.length || 0} names submitted
        </div>
      </div>
    );
  }

  // Voting phase
  if (npcData.status === 'voting') {
    const sortedSubmissions = [...(npcData.submissions || [])].sort((a, b) => b.votes - a.votes);
    
    return (
      <div className="npc-naming-container voting">
        <h2>Vote for Your Favorite!</h2>
        
        <div className="npc-description">
          {npcData.description}
        </div>

        <div className="voting-options">
          {sortedSubmissions.slice(0, 5).map((sub, index) => (
            <motion.button
              key={index}
              className={`vote-option ${hasVoted ? 'voted' : ''}`}
              onClick={() => voteForName(npcData.submissions.indexOf(sub))}
              disabled={hasVoted}
              whileHover={{ scale: hasVoted ? 1 : 1.05 }}
              whileTap={{ scale: hasVoted ? 1 : 0.95 }}
            >
              <span className="name">{sub.name}</span>
              {hasVoted && <span className="vote-count">{sub.votes} votes</span>}
            </motion.button>
          ))}
        </div>

        {hasVoted && (
          <div className="submitted-message">
            <span>✓</span> Vote cast!
          </div>
        )}
      </div>
    );
  }

  // Revealing winner
  if (npcData.status === 'revealing') {
    return (
      <div className="npc-naming-container revealing">
        <h2>Their Name Is...</h2>
        
        <motion.div 
          className="winner-name"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
        >
          {npcData.winner}
        </motion.div>
        
        <div className="npc-description">
          {npcData.description}
        </div>
      </div>
    );
  }

  return null;
}
