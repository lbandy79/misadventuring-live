# Misadventuring Party Live App — Day 1 Setup Guide

## Overview
By the end of this guide, you'll have:
- A working React app running locally
- Firebase connected with real-time database
- A functional voting component that updates live across multiple browser tabs
- Foundation for all your crowd interaction features

**Time estimate:** 45–60 minutes (most of that is Firebase console setup)

---

## Part 1: Install Prerequisites

### 1.1 Node.js
1. Go to [nodejs.org](https://nodejs.org)
2. Download the **LTS** version (not Current)
3. Run installer, accept defaults
4. Verify in terminal/PowerShell:
   ```bash
   node --version
   # Should show v20.x.x or v22.x.x
   
   npm --version
   # Should show 10.x.x
   ```

### 1.2 Git
1. Go to [git-scm.com](https://git-scm.com)
2. Download and install (defaults are fine)
3. Verify:
   ```bash
   git --version
   ```

### 1.3 VSCode Extensions
Open VSCode, go to Extensions (Ctrl+Shift+X), install:
- `ES7+ React/Redux/React-Native snippets`
- `Prettier - Code formatter`
- `ESLint`
- `GitHub Copilot` (sign in with your GitHub account for free tier)

---

## Part 2: Create the React Project

Open PowerShell or terminal. Navigate to where you want the project:

```bash
# Example: put it in a Projects folder
cd C:\Users\YourName\Projects

# Create the project with Vite
npm create vite@latest misadventuring-live -- --template react

# Move into the project
cd misadventuring-live

# Install dependencies
npm install

# Install additional packages we need
npm install firebase framer-motion

# Open in VSCode
code .
```

Test that it works:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser. You should see the Vite + React starter page.

**Leave this terminal running** — it hot-reloads as you code.

---

## Part 3: Set Up Firebase

### 3.1 Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it `misadventuring-live` (or whatever you want)
4. Disable Google Analytics (you don't need it for this)
5. Click **Create project**, wait for it to provision

### 3.2 Create Firestore Database
1. In Firebase Console, click **"Build"** in left sidebar
2. Click **"Firestore Database"**
3. Click **"Create database"**
4. Choose **"Start in test mode"** (we'll secure it later)
5. Pick a region (us-central1 is fine)
6. Click **Enable**

### 3.3 Register Your Web App
1. On the Firebase project overview page, click the **web icon** (`</>`)
2. Nickname: `misadventuring-web`
3. Don't check "Firebase Hosting" (we'll use Vercel later)
4. Click **Register app**
5. You'll see a config object — **COPY THIS ENTIRE THING**

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "misadventuring-live.firebaseapp.com",
  projectId: "misadventuring-live",
  storageBucket: "misadventuring-live.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Part 4: Connect Firebase to Your App

### 4.1 Create Firebase Config File

In VSCode, create a new file: `src/firebase.js`

Paste this, replacing the config with YOUR values from Step 3.3:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // PASTE YOUR CONFIG HERE
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

---

## Part 5: Build Your First Voting Component

### 5.1 Create the Component

Create a new file: `src/components/EncounterVote.jsx`

```jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const VOTE_DOC_ID = 'current-vote'; // We'll use a single document for the active vote

export default function EncounterVote() {
  const [votes, setVotes] = useState({ left: 0, right: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vote options - you'll make these dynamic later
  const options = {
    left: { label: "Fight the Goblin King", emoji: "⚔️" },
    right: { label: "Negotiate for Peace", emoji: "🕊️" }
  };

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'votes', VOTE_DOC_ID),
      (snapshot) => {
        if (snapshot.exists()) {
          setVotes(snapshot.data());
        }
        setIsLoading(false);
      }
    );

    // Check if user already voted (simple localStorage for now)
    const voted = localStorage.getItem(`voted-${VOTE_DOC_ID}`);
    if (voted) setHasVoted(true);

    return () => unsubscribe();
  }, []);

  const castVote = async (choice) => {
    if (hasVoted) return;

    const voteRef = doc(db, 'votes', VOTE_DOC_ID);
    const snapshot = await getDoc(voteRef);

    if (snapshot.exists()) {
      await updateDoc(voteRef, {
        [choice]: votes[choice] + 1
      });
    } else {
      // First vote ever - create the document
      await setDoc(voteRef, { left: 0, right: 0, [choice]: 1 });
    }

    localStorage.setItem(`voted-${VOTE_DOC_ID}`, choice);
    setHasVoted(true);
  };

  const totalVotes = votes.left + votes.right;
  const leftPercent = totalVotes > 0 ? (votes.left / totalVotes) * 100 : 50;
  const rightPercent = totalVotes > 0 ? (votes.right / totalVotes) * 100 : 50;

  if (isLoading) {
    return <div className="vote-container">Loading...</div>;
  }

  return (
    <div className="vote-container">
      <h2>What should the party do?</h2>
      
      <div className="vote-options">
        <motion.button
          className={`vote-btn left ${hasVoted ? 'disabled' : ''}`}
          onClick={() => castVote('left')}
          whileHover={!hasVoted ? { scale: 1.05 } : {}}
          whileTap={!hasVoted ? { scale: 0.95 } : {}}
          disabled={hasVoted}
        >
          <span className="emoji">{options.left.emoji}</span>
          <span className="label">{options.left.label}</span>
          {hasVoted && <span className="count">{votes.left} votes</span>}
        </motion.button>

        <motion.button
          className={`vote-btn right ${hasVoted ? 'disabled' : ''}`}
          onClick={() => castVote('right')}
          whileHover={!hasVoted ? { scale: 1.05 } : {}}
          whileTap={!hasVoted ? { scale: 0.95 } : {}}
          disabled={hasVoted}
        >
          <span className="emoji">{options.right.emoji}</span>
          <span className="label">{options.right.label}</span>
          {hasVoted && <span className="count">{votes.right} votes</span>}
        </motion.button>
      </div>

      {/* Live results bar */}
      <div className="results-bar">
        <motion.div 
          className="bar-fill left"
          initial={{ width: '50%' }}
          animate={{ width: `${leftPercent}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
        <motion.div 
          className="bar-fill right"
          initial={{ width: '50%' }}
          animate={{ width: `${rightPercent}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      <p className="total-votes">{totalVotes} adventurers have voted</p>

      {hasVoted && (
        <motion.p 
          className="voted-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Your voice has been heard! ✨
        </motion.p>
      )}
    </div>
  );
}
```

### 5.2 Add Styles

Create: `src/components/EncounterVote.css`

```css
.vote-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  color: #eee;
  font-family: 'Segoe UI', system-ui, sans-serif;
  text-align: center;
}

.vote-container h2 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #ffd700;
}

.vote-options {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.vote-btn {
  flex: 1;
  padding: 1.5rem 1rem;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.vote-btn.left {
  background: linear-gradient(135deg, #c0392b 0%, #962d22 100%);
}

.vote-btn.right {
  background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
}

.vote-btn:hover:not(.disabled) {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.vote-btn.disabled {
  opacity: 0.8;
  cursor: default;
}

.vote-btn .emoji {
  font-size: 2.5rem;
}

.vote-btn .label {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

.vote-btn .count {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.25rem;
}

.results-bar {
  display: flex;
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: #0d0d1a;
  margin-bottom: 1rem;
}

.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.bar-fill.left {
  background: linear-gradient(90deg, #c0392b, #e74c3c);
}

.bar-fill.right {
  background: linear-gradient(90deg, #27ae60, #2ecc71);
}

.total-votes {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.voted-message {
  color: #ffd700;
  font-weight: 500;
}
```

### 5.3 Update App.jsx

Replace the contents of `src/App.jsx`:

```jsx
import EncounterVote from './components/EncounterVote'
import './components/EncounterVote.css'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f',
      padding: '2rem'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          color: '#ffd700', 
          fontSize: '2rem',
          fontFamily: 'Georgia, serif'
        }}>
          The Misadventuring Party
        </h1>
        <p style={{ color: '#888' }}>Live Audience Interaction</p>
      </header>
      
      <EncounterVote />
    </div>
  )
}

export default App
```

### 5.4 Clean Up Default Styles

Replace `src/index.css` with:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Part 6: Test It!

1. Make sure your dev server is still running (`npm run dev`)
2. Open `http://localhost:5173` in your browser
3. Click a vote option
4. **Open a second browser tab** to the same URL
5. Watch the vote count update in real-time across both tabs!

---

## Part 7: Initialize the Vote Document (One-Time)

If you see no data or errors, manually create the initial document:

1. Go to Firebase Console → Firestore Database
2. Click **"Start collection"**
3. Collection ID: `votes`
4. Document ID: `current-vote`
5. Add fields:
   - `left` (number): `0`
   - `right` (number): `0`
6. Click **Save**

Refresh your app — should work now.

---

## What You've Built

✅ React app with hot reloading  
✅ Firebase real-time database connection  
✅ Live voting component with animated results  
✅ Persisted votes (survives refresh)  
✅ Multi-tab real-time sync  
✅ Foundation for all future features  

---

## Next Steps (Future Sessions)

1. **Admin Panel** — Change vote options on the fly during shows
2. **QR Code Generator** — Easy audience access
3. **Reset Votes** — Clear between encounters
4. **More Components** — Madlibs, NPC naming, group rolls
5. **Theming** — Match your brand
6. **Deploy to Vercel** — Get it live on the internet

---

## Troubleshooting

**"Module not found" errors**  
Run `npm install` again, make sure you're in the right folder.

**Firebase permission denied**  
Your Firestore rules might have expired (test mode lasts 30 days). Go to Firestore → Rules and set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
⚠️ This is wide open — fine for dev, you'll lock it down before going live.

**Votes not updating**  
Check browser console (F12) for errors. Usually a typo in the Firebase config.

---

## File Structure When Done

```
misadventuring-live/
├── node_modules/
├── public/
├── src/
│   ├── components/
│   │   ├── EncounterVote.jsx
│   │   └── EncounterVote.css
│   ├── App.jsx
│   ├── firebase.js
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

---

**You're ready to build.** 🎲
