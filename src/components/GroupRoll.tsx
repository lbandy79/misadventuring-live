import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './GroupRoll.css';

interface RollEntry {
  userId: string;
  result: number;
  timestamp: number;
}

interface RollData {
  prompt: string;
  diceType: string;
  modifier: number;
  dc: number;
  mode: 'collective' | 'individual' | 'best-of' | 'worst-of';
  rolls: RollEntry[];
  status: 'rolling' | 'results' | 'idle';
}

interface GroupRollProps {
  isAdmin?: boolean;
}

export default function GroupRoll({ isAdmin: _isAdmin = false }: GroupRollProps) {
  const [rollData, setRollData] = useState<RollData | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [myRoll, setMyRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [userId] = useState(() => localStorage.getItem('audience-id') || Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    localStorage.setItem('audience-id', userId);
    
    const unsubscribe = onSnapshot(doc(db, 'group-roll', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as RollData;
        setRollData(data);
        
        // Check if user already rolled
        const userRoll = data.rolls?.find(r => r.userId === userId);
        if (userRoll) {
          setHasRolled(true);
          setMyRoll(userRoll.result);
        } else {
          setHasRolled(false);
          setMyRoll(null);
        }
      } else {
        setRollData(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const rollDice = async () => {
    if (hasRolled || !rollData || isRolling) return;
    
    setIsRolling(true);
    
    // Animate the roll
    const diceMax = parseInt(rollData.diceType.replace('d', ''));
    
    // Quick animation of changing numbers
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const animationRoll = Math.floor(Math.random() * diceMax) + 1;
      setMyRoll(animationRoll);
    }
    
    // Final roll
    const finalRoll = Math.floor(Math.random() * diceMax) + 1;
    setMyRoll(finalRoll);
    
    try {
      await updateDoc(doc(db, 'group-roll', 'current'), {
        rolls: arrayUnion({
          userId,
          result: finalRoll,
          timestamp: Date.now()
        })
      });
      setHasRolled(true);
    } catch (error) {
      console.error('Failed to submit roll:', error);
    }
    
    setIsRolling(false);
  };

  // Idle state
  if (!rollData || rollData.status === 'idle') {
    return (
      <div className="group-roll-container idle">
        <div className="waiting-icon">🎲</div>
        <h2>Group Roll</h2>
        <p>Waiting for the GM to call for a roll...</p>
      </div>
    );
  }

  const totalRolls = rollData.rolls?.length || 0;
  const dc = rollData.dc || 10;
  const modifier = rollData.modifier || 0;

  // Active rolling phase
  if (rollData.status === 'rolling') {
    return (
      <div className="group-roll-container rolling">
        <h2>{rollData.prompt || 'Roll!'}</h2>
        
        <div className="roll-info">
          <span className="dice-type">{rollData.diceType}</span>
          {modifier !== 0 && (
            <span className="modifier">
              {modifier > 0 ? '+' : ''}{modifier}
            </span>
          )}
          <span className="dc">DC {dc}</span>
        </div>

        {!hasRolled ? (
          <motion.button
            className="roll-button"
            onClick={isRolling ? undefined : rollDice}
            style={isRolling ? { pointerEvents: 'none', opacity: 0.7 } : {}}
            whileHover={isRolling ? {} : { scale: 1.05 }}
            whileTap={isRolling ? {} : { scale: 0.95 }}
          >
            {isRolling ? (
              <span className="rolling-number">{myRoll}</span>
            ) : (
              <>🎲 Roll!</>
            )}
          </motion.button>
        ) : (
          <div className="my-roll-result">
            <div className={`roll-value ${(myRoll ?? 0) + modifier >= dc ? 'success' : 'fail'}`}>
              {myRoll}
              {modifier !== 0 && <span className="modifier-display">+{modifier}={(myRoll ?? 0) + modifier}</span>}
            </div>
            <div className="roll-outcome">
              {(myRoll ?? 0) + modifier >= dc ? '✓ Success!' : '✗ Failed'}
            </div>
          </div>
        )}

        <div className="roll-count">
          {totalRolls} adventurers have rolled
        </div>

        {/* Live roll feed */}
        <div className="live-rolls">
          <AnimatePresence>
            {rollData.rolls?.slice(-5).reverse().map((roll) => (
              <motion.div
                key={roll.timestamp}
                className={`roll-pip ${roll.result + modifier >= dc ? 'success' : 'fail'}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                {roll.result}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Results phase
  if (rollData.status === 'results') {
    const rolls = rollData.rolls || [];
    const successes = rolls.filter(r => r.result + modifier >= dc).length;
    const failures = rolls.length - successes;
    const total = rolls.reduce((sum, r) => sum + r.result, 0);
    const average = rolls.length > 0 ? (total / rolls.length).toFixed(1) : '0';
    const highest = rolls.length > 0 ? Math.max(...rolls.map(r => r.result)) : 0;
    const _lowest = rolls.length > 0 ? Math.min(...rolls.map(r => r.result)) : 0;

    return (
      <div className="group-roll-container results">
        <h2>Results!</h2>
        
        <div className="results-grid">
          <div className="result-card successes">
            <div className="result-value">{successes}</div>
            <div className="result-label">Successes</div>
          </div>
          <div className="result-card failures">
            <div className="result-value">{failures}</div>
            <div className="result-label">Failures</div>
          </div>
          <div className="result-card average">
            <div className="result-value">{average}</div>
            <div className="result-label">Average</div>
          </div>
          <div className="result-card highest">
            <div className="result-value">{highest}</div>
            <div className="result-label">Highest</div>
          </div>
        </div>

        <div className="success-bar">
          <div 
            className="success-fill"
            style={{ width: `${rolls.length > 0 ? (successes / rolls.length) * 100 : 0}%` }}
          />
        </div>
        <div className="success-label">
          {rolls.length > 0 ? Math.round((successes / rolls.length) * 100) : 0}% success rate
        </div>
      </div>
    );
  }

  return null;
}
