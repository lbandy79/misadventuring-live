/**
 * System Config Provider
 * 
 * React context that loads a TTRPG system JSON and makes it available app-wide.
 * Components read stats, dice, NPC creator fields, and show config through useSystemConfig().
 * Swap the systemId prop and the entire app adapts to a different game system.
 */

import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { SystemConfig } from '../types/system.types';

interface SystemConfigContextValue {
  config: SystemConfig | null;
  loading: boolean;
  error: string | null;
}

const SystemConfigContext = createContext<SystemConfigContextValue>({
  config: null,
  loading: true,
  error: null,
});

interface SystemConfigProviderProps {
  systemId: string;
  children: ReactNode;
}

export function SystemConfigProvider({ systemId, children }: SystemConfigProviderProps) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Dynamic import of system JSON by ID
    import(`../systems/${systemId}.system.json`)
      .then((module) => {
        setConfig(module.default ?? module);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`Failed to load system config: ${systemId}`, err);
        setError(`Could not load system "${systemId}"`);
        setLoading(false);
      });
  }, [systemId]);

  return (
    <SystemConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </SystemConfigContext.Provider>
  );
}

export { SystemConfigContext };
