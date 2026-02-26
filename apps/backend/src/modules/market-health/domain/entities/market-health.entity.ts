import { MarketHealthStatus } from '../value-objects/market-health-status';

export class MarketHealth {
  private constructor(
    public readonly id: string,
    public readonly status: MarketHealthStatus,
    public readonly ema9: number,
    public readonly ema21: number,
    public readonly computedAt: Date,
  ) {}

  static create(params: {
    id: string;
    status: MarketHealthStatus;
    ema9: number;
    ema21: number;
    computedAt: Date;
  }): MarketHealth {
    return new MarketHealth(
      params.id,
      params.status,
      params.ema9,
      params.ema21,
      params.computedAt,
    );
  }
}
