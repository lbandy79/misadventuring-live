/**
 * Small badges for the rules data's playtest / maturity flags. This is a
 * playtest tool, so "under evaluation" is information the team wants.
 * `swap` (IP rename tracking) is deliberately not rendered anywhere.
 */

import type { Maturity, PlaytestFlag } from '@mtp/lib';

export function ContentFlagBadges({ playtest, maturity }: { playtest?: PlaytestFlag; maturity?: Maturity }) {
  if (!playtest && (!maturity || maturity === 'core')) return null;
  return (
    <span className="sbp-flags">
      {maturity && maturity !== 'core' && (
        <span className={`sbp-flag sbp-flag--${maturity}`}>{maturity}</span>
      )}
      {playtest && (
        <span className={`sbp-flag sbp-flag--playtest`} title={playtest.note}>
          playtest: {playtest.status.replace('_', ' ')}
        </span>
      )}
    </span>
  );
}
