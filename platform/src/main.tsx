/**
 * MTP Platform — Phase 4 entry point.
 *
 * Wraps the unified app with the same providers used by the live show
 * (ShowProvider) so any imported lib component behaves identically. Theme
 * and SystemConfig providers are added per-route as needed (Show route
 * uses them, marketing/reservation/companion routes do not need a TTRPG
 * system loaded).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, ShowProvider } from '@mtp/lib';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ShowProvider>
          <App />
        </ShowProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
