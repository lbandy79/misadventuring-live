import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './themes';
import { SystemConfigProvider } from './contexts/SystemConfigProvider';
import { ShowProvider } from './lib/shows';
import { AuthProvider } from './lib/auth';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ShowProvider>
          <ThemeProvider initialThemeId="betawave-tapes">
            <SystemConfigProvider systemId="kids-on-bikes-2e">
              <App />
            </SystemConfigProvider>
          </ThemeProvider>
        </ShowProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
