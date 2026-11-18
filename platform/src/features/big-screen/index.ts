/**
 * Big screen: what the projector shows (Off / Townies / Rumors / Both), the
 * combined Townies + Rumors layout, the GM picker with its crowding
 * warning, and the phone "On the big screen" page. The only file other
 * code imports from.
 */

export { CombinedScreen } from './components/CombinedScreen';
export { TownieColumn } from './components/TownieColumn';
export { ScreenPickerPanel } from './components/ScreenPickerPanel';
export { CrowdingWarning } from './components/CrowdingWarning';
export { PhoneScreenPage } from './components/PhoneScreenPage';
export { resolveBigScreenCopy, type BigScreenCopy } from './config';
export {
  BOTH_RUMORS_PER_PAGE,
  SCREEN_MODES,
  TOWNIE_FIT,
  screenModeFrom,
  townieCrowding,
  writesForMode,
  type ScreenMode,
} from './screenMode';
