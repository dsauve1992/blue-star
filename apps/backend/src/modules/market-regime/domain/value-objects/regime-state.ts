import { InvariantError } from '../domain-errors';
import { MarketHealthStatusValue } from '../../../market-health/domain/value-objects/market-health-status';
import { BreadthSignalValue } from './breadth-signal';

export enum RegimeStateValue {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export class RegimeState {
  private constructor(public readonly value: RegimeStateValue) {}

  static of(value: string): RegimeState {
    if (!Object.values(RegimeStateValue).includes(value as RegimeStateValue)) {
      throw new InvariantError(`Invalid regime state: ${value}`);
    }
    return new RegimeState(value as RegimeStateValue);
  }

  static green(): RegimeState {
    return new RegimeState(RegimeStateValue.GREEN);
  }

  static yellow(): RegimeState {
    return new RegimeState(RegimeStateValue.YELLOW);
  }

  static red(): RegimeState {
    return new RegimeState(RegimeStateValue.RED);
  }

  /**
   * Composite regime is the "worse" of the two inputs: the SPY-trend
   * market-health status and the leader-breadth signal.
   */
  static deriveFrom(
    marketHealthStatus: MarketHealthStatusValue,
    breadthSignal: BreadthSignalValue,
  ): RegimeState {
    // Worst case: either the broad trend is broken OR leadership is contracting.
    if (
      marketHealthStatus === MarketHealthStatusValue.BAD ||
      breadthSignal === BreadthSignalValue.CONTRACTING
    ) {
      return RegimeState.red();
    }

    // Best case: broad trend is healthy AND leadership is expanding.
    if (
      marketHealthStatus === MarketHealthStatusValue.GOOD &&
      breadthSignal === BreadthSignalValue.EXPANDING
    ) {
      return RegimeState.green();
    }

    // Everything in between (WARNING, or NEUTRAL, or a mixed signal) → yellow.
    return RegimeState.yellow();
  }
}
