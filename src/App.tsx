import { Routes, Route } from 'react-router-dom';
import AudienceView from './components/AudienceView';
import AdminPanel from './admin/AdminPanel';
import DisplayView from './components/DisplayView';
import './index.css';

// Import theme animation CSS files
import './themes/tmpBase.animations.css';
import './themes/soggyBottomPirates.animations.css';
import './themes/neonNightmares.animations.css';

// Import global effects (CRT, shake, glitch, etc.)
import './styles/effects.css';

// Import TMP icon styles
import './components/icons/TMPIcons.css';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<AudienceView />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/display" element={<DisplayView />} />
      </Routes>
    </div>
  );
}

export default App;
