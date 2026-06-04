import { RegimeState, RegimeStateValue } from './regime-state';
import { BreadthSignalValue } from './breadth-signal';
import { MarketHealthStatusValue } from '../../../market-health/domain/value-objects/market-health-status';
import { InvariantError } from '../domain-errors';

describe('RegimeState', () => {
  describe('deriveFrom (worse-of truth table)', () => {
    it.each([
      // marketHealth, breadth, expected
      [
        MarketHealthStatusValue.BAD,
        BreadthSignalValue.EXPANDING,
        RegimeStateValue.RED,
      ],
      [
        MarketHealthStatusValue.GOOD,
        BreadthSignalValue.CONTRACTING,
        RegimeStateValue.RED,
      ],
      [
        MarketHealthStatusValue.GOOD,
        BreadthSignalValue.EXPANDING,
        RegimeStateValue.GREEN,
      ],
      [
        MarketHealthStatusValue.GOOD,
        BreadthSignalValue.NEUTRAL,
        RegimeStateValue.YELLOW,
      ],
      [
        MarketHealthStatusValue.WARNING,
        BreadthSignalValue.EXPANDING,
        RegimeStateValue.YELLOW,
      ],
      [
        MarketHealthStatusValue.WARNING,
        BreadthSignalValue.CONTRACTING,
        RegimeStateValue.RED,
      ],
    ])('(%s, %s) → %s', (marketHealth, breadth, expected) => {
      expect(RegimeState.deriveFrom(marketHealth, breadth).value).toBe(
        expected,
      );
    });
  });

  describe('of', () => {
    it('rejects an invalid value with InvariantError', () => {
      expect(() => RegimeState.of('PURPLE')).toThrow(InvariantError);
    });
  });
});
