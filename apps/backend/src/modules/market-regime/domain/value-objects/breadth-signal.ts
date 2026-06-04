import { InvariantError } from '../domain-errors';

export enum BreadthSignalValue {
  EXPANDING = 'EXPANDING',
  NEUTRAL = 'NEUTRAL',
  CONTRACTING = 'CONTRACTING',
}

export class BreadthSignal {
  // Tunable thresholds for the leader-breadth signal, expressed as multipliers
  // of the leader-count moving average.
  //
  // A "sharp" contraction: leader count has fallen more than 10% below its MA.
  private static readonly CONTRACTION_FLOOR = 0.9;
  // Expansion: leader count is above its MA (more than 100% of it).
  private static readonly EXPANSION_CEILING = 1.0;

  private constructor(public readonly value: BreadthSignalValue) {}

  static of(value: string): BreadthSignal {
    if (
      !Object.values(BreadthSignalValue).includes(value as BreadthSignalValue)
    ) {
      throw new InvariantError(`Invalid breadth signal: ${value}`);
    }
    return new BreadthSignal(value as BreadthSignalValue);
  }

  static expanding(): BreadthSignal {
    return new BreadthSignal(BreadthSignalValue.EXPANDING);
  }

  static neutral(): BreadthSignal {
    return new BreadthSignal(BreadthSignalValue.NEUTRAL);
  }

  static contracting(): BreadthSignal {
    return new BreadthSignal(BreadthSignalValue.CONTRACTING);
  }

  static deriveFrom(leaderCount: number, leaderCountMa: number): BreadthSignal {
    // Warmup / no history yet: no MA to compare against → neutral.
    if (leaderCountMa === 0) {
      return BreadthSignal.neutral();
    }

    // Count fell sharply below its MA → contracting (risk-off).
    if (leaderCount < leaderCountMa * BreadthSignal.CONTRACTION_FLOOR) {
      return BreadthSignal.contracting();
    }

    // Count sits above its MA → expanding (risk-on).
    if (leaderCount > leaderCountMa * BreadthSignal.EXPANSION_CEILING) {
      return BreadthSignal.expanding();
    }

    // Within the band (between 90% and 100% of MA) → neutral.
    return BreadthSignal.neutral();
  }
}
