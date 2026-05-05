/**
 * `src/lib/shows` — Show config registry + provider.
 *
 * Phase 3a: introduce platform-level Show definitions and a React context
 * that resolves the active show from `config/active-interaction.showId`.
 * No existing consumers depend on this yet; migration happens in 3b/3c.
 */

export * from './registry';
export {
  ShowProvider,
  useShow,
  useShowOptional,
  setCurrentShow,
  type ShowContextValue,
  type PlatformConfig,
} from './ShowProvider';
export { beastOfRidgefallShow } from './beast-of-ridgefall.show';
export { betawaveTapesShow } from './betawave-tapes.show';
export { soggyBottomPiratesShow } from './soggy-bottom-pirates.show';
