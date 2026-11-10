/**
 * Rumor Mill (Green Oaks): the audience's townies start rumors, the GM
 * approves them, the app secretly tests each one with a card draw.
 *
 * This file is the only thing other code imports from. Data access lives in
 * src/lib/rumors; config in `showConfig.rumorMill` of the show's system JSON.
 */

export { RumorMillPhone } from './components/RumorMillPhone';
export { RumorMillAdminPanel } from './components/RumorMillAdminPanel';
export { RumorBoard } from './components/RumorBoard';
export { useRumorMillSession } from './hooks/useRumorMill';
export { buildDemoRumors } from './demoRumors';
export {
  buildByline,
  resolveRumorMillConfig,
  type RawRumorMillConfig,
  type RumorMillConfig,
} from './config';
