/**
 * useSystemConfig Hook
 * 
 * Convenience hook for consuming the system config context.
 * Returns the full SystemConfig, loading state, and any error.
 */

import { useContext } from 'react';
import { SystemConfigContext } from '../contexts/SystemConfigProvider';
import type { SystemConfig, Stat } from '../types/system.types';

export function useSystemConfig() {
  const context = useContext(SystemConfigContext);
  if (context === undefined) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
}

/** Get a stat by ID from the system config */
export function getStatById(config: SystemConfig, statId: string): Stat | undefined {
  return config.stats.find(s => s.id === statId);
}

/** Get stat display name, falling back to the ID */
export function getStatName(config: SystemConfig, statId: string): string {
  return config.stats.find(s => s.id === statId)?.name ?? statId;
}
