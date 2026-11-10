import type { RumorVerdict } from '@mtp/lib/rumors';
import type { RumorMillCopy } from '../config';

/**
 * The rubber stamp on a revealed rumor. The word and the mark (✓ / ✗) carry
 * the meaning; colour is only a third signal.
 */
export function VerdictStamp({
  verdict,
  copy,
  size = 'large',
}: {
  verdict: RumorVerdict;
  copy: Pick<RumorMillCopy, 'trueLabel' | 'falseLabel'>;
  size?: 'small' | 'large';
}) {
  const isTrue = verdict === 'true';
  return (
    <span className={`rumor-stamp rumor-stamp--${verdict} rumor-stamp--${size}`}>
      <span aria-hidden="true">{isTrue ? '✓' : '✗'}</span>{' '}
      {isTrue ? copy.trueLabel : copy.falseLabel}
    </span>
  );
}
