import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './themes';
import { SystemConfigProvider } from './contexts/SystemConfigProvider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider initialThemeId="betawave-tapes">
        <SystemConfigProvider systemId="kids-on-bikes-2e">
          <App />
        </SystemConfigProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
