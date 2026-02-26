import { InvariantError } from '../domain-errors';

export enum MarketHealthStatusValue {
  GOOD = 'GOOD',
  WARNING = 'WARNING',
  BAD = 'BAD',
}

export class MarketHealthStatus {
  private constructor(public readonly value: MarketHealthStatusValue) {}

  static of(value: string): MarketHealthStatus {
    if (
      !Object.values(MarketHealthStatusValue).includes(
        value as MarketHealthStatusValue,
      )
    ) {
      throw new InvariantError(`Invalid market health status: ${value}`);
    }
    return new MarketHealthStatus(value as MarketHealthStatusValue);
  }

  static good(): MarketHealthStatus {
    return new MarketHealthStatus(MarketHealthStatusValue.GOOD);
  }

  static warning(): MarketHealthStatus {
    return new MarketHealthStatus(MarketHealthStatusValue.WARNING);
  }

  static bad(): MarketHealthStatus {
    return new MarketHealthStatus(MarketHealthStatusValue.BAD);
  }
}
