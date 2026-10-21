import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SeasonDecor from '../../../platform/src/components/SeasonDecor';
import { resolveSeason } from '../../../platform/src/styles/seasons/useSeason';

describe('resolveSeason', () => {
  it('uses the configured season by default', () => {
    expect(resolveSeason('', 'halloween')).toBe('halloween');
    expect(resolveSeason('', null)).toBeNull();
  });

  it('turns theming off with ?season=none or ?season=off (the show-night kill switch)', () => {
    expect(resolveSeason('?season=none', 'halloween')).toBeNull();
    expect(resolveSeason('?season=off', 'halloween')).toBeNull();
  });

  it('forces a known season and ignores unknown ones', () => {
    expect(resolveSeason('?season=halloween', null)).toBe('halloween');
    expect(resolveSeason('?season=easter', 'halloween')).toBe('halloween');
    expect(resolveSeason('?season=easter', null)).toBeNull();
  });
});

describe('SeasonDecor', () => {
  it('renders nothing without a season', () => {
    const { container } = render(<SeasonDecor season={null} variant="band" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden from assistive tech and never interactive', () => {
    const { container } = render(<SeasonDecor season="halloween" variant="band" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    expect(root.querySelectorAll('svg')).toHaveLength(6); // 2 webs, moon, 3 bats
  });
});
