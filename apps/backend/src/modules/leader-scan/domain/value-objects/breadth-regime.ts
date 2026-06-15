import { InvariantError } from '../domain-errors';

/**
 * Market-regime classification derived from the leader-scan breadth gauge.
 *
 * A long, expanding list of leaders is a risk-on regime (GREEN); a
 * contracting list signals deteriorating breadth (RED). YELLOW is the
 * mixed/transitional state. Mirrors the GREEN/YELLOW/RED idiom used by the
 * SPY-trend MarketHealthStatus so the dashboard speaks one language.
 */
export enum BreadthRegimeValue {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export class BreadthRegime {
  private constructor(public readonly value: BreadthRegimeValue) {}

  static of(value: string): BreadthRegime {
    if (
      !Object.values(BreadthRegimeValue).includes(value as BreadthRegimeValue)
    ) {
      throw new InvariantError(`Invalid breadth regime: ${value}`);
    }
    return new BreadthRegime(value as BreadthRegimeValue);
  }

  static green(): BreadthRegime {
    return new BreadthRegime(BreadthRegimeValue.GREEN);
  }

  static yellow(): BreadthRegime {
    return new BreadthRegime(BreadthRegimeValue.YELLOW);
  }

  static red(): BreadthRegime {
    return new BreadthRegime(BreadthRegimeValue.RED);
  }
}
