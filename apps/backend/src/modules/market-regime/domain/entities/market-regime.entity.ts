import { RegimeState } from '../value-objects/regime-state';
import { MarketHealthStatusValue } from '../../../market-health/domain/value-objects/market-health-status';
import { BreadthSignal } from '../value-objects/breadth-signal';

export class MarketRegime {
  private constructor(
    public readonly id: string,
    public readonly state: RegimeState,
    public readonly marketHealthStatus: MarketHealthStatusValue,
    public readonly leaderCount: number,
    public readonly leaderCountMa: number,
    public readonly breadthSignal: BreadthSignal,
    public readonly computedAt: Date,
  ) {}

  static create(params: {
    id: string;
    state: RegimeState;
    marketHealthStatus: MarketHealthStatusValue;
    leaderCount: number;
    leaderCountMa: number;
    breadthSignal: BreadthSignal;
    computedAt: Date;
  }): MarketRegime {
    return new MarketRegime(
      params.id,
      params.state,
      params.marketHealthStatus,
      params.leaderCount,
      params.leaderCountMa,
      params.breadthSignal,
      params.computedAt,
    );
  }
}
