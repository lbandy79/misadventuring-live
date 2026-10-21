import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ACTIVE_SEASON, SEASONS, type SeasonId } from './seasons.config';
// Every rule in here is scoped under [data-season="…"], so loading it globally is inert.
import './halloween.css';

/** `?season=none|off` disables, `?season=<id>` forces, otherwise the configured default. */
export function resolveSeason(search: string, active: SeasonId | null = ACTIVE_SEASON): SeasonId | null {
  const param = new URLSearchParams(search).get('season');
  if (param === 'none' || param === 'off') return null;
  if (param && (SEASONS as readonly string[]).includes(param)) return param as SeasonId;
  return active;
}

export function useSeason(): SeasonId | null {
  const { search } = useLocation();
  return useMemo(() => resolveSeason(search), [search]);
}
