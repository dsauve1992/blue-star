import { BreadthSignal, BreadthSignalValue } from './breadth-signal';

describe('BreadthSignal', () => {
  describe('deriveFrom', () => {
    it.each([
      // leaderCount, leaderCountMa, expected, description
      [100, 0, BreadthSignalValue.NEUTRAL, 'warmup (no MA history)'],
      [80, 100, BreadthSignalValue.CONTRACTING, '20% below MA'],
      [110, 100, BreadthSignalValue.EXPANDING, 'above MA'],
      [95, 100, BreadthSignalValue.NEUTRAL, 'within the band'],
    ])('(%i, %i) → %s (%s)', (leaderCount, leaderCountMa, expected) => {
      expect(BreadthSignal.deriveFrom(leaderCount, leaderCountMa).value).toBe(
        expected,
      );
    });
  });
});
