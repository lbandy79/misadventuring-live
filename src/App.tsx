import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Component, type ReactNode } from 'react';
import AudienceView from './components/AudienceView';
import AdminPanel from './admin/AdminPanel';
import DisplayView from './components/DisplayView';
import PlayerView from './components/PlayerView';
import PlayView from './components/PlayView';
import NPCCreationPage from './components/NPCCreator/NPCCreationPage';
import BladeRunnerCreationPage from './components/BladeRunnerCreator/BladeRunnerCreationPage';
import BladeRunnerSheetPage from './components/BladeRunnerSheet/BladeRunnerSheetPage';
import BladeRunnerRoster from './components/BladeRunnerSheet/BladeRunnerRoster';
import QRDisplay from './components/QRDisplay';
import FantasyBackground from './components/FantasyBackground';
import './index.css';

// Import theme animation CSS files
import './themes/tmpBase.animations.css';
import './themes/soggyBottomPirates.animations.css';
import './themes/neonNightmares.animations.css';
import './themes/beastOfRidgefall.animations.css';
import './themes/betawaveTapes.animations.css';

// Import global effects (CRT, shake, glitch, etc.)
import './styles/effects.css';

// Import TMP icon styles
import './components/icons/TMPIcons.css';

/** Safety-net redirect: if someone lands on /?code=XXXX, send them to /create?code=XXXX */
function CodeRedirect() {
  const [params] = useSearchParams();
  const code = params.get('code');
  if (code) {
    return <Navigate to={`/create?code=${encodeURIComponent(code)}`} replace />;
  }
  return <AudienceView />;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#eee', background: '#0d0d14', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#e74c3c' }}>Something went wrong</h1>
          <pre style={{ color: '#ff9999', whiteSpace: 'pre-wrap', fontSize: '0.85rem', marginTop: '1rem' }}>
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#ffd700', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <div className="app-container">
        <FantasyBackground />
        <Routes>
          <Route path="/" element={<CodeRedirect />} />
          <Route path="/create" element={<NPCCreationPage />} />
          <Route path="/blade-runner/create" element={<BladeRunnerCreationPage />} />
          <Route path="/blade-runner/roster" element={<BladeRunnerRoster />} />
          <Route path="/blade-runner/play/:id" element={<BladeRunnerSheetPage />} />
          <Route path="/play/:npcId" element={<PlayView />} />
          <Route path="/player/:playerId" element={<PlayerView />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/display" element={<DisplayView />} />
          <Route path="/qr" element={<QRDisplay />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
