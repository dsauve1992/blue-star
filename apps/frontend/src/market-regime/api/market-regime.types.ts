export type RegimeState = 'GREEN' | 'YELLOW' | 'RED';

export type MarketHealthStatus = 'GOOD' | 'WARNING' | 'BAD';

export type BreadthSignal = 'EXPANDING' | 'NEUTRAL' | 'CONTRACTING';

export interface ExposureBand {
  perTradeRiskPct: number;
  maxPortfolioHeatPct: number;
  maxSectorHeatPct: number;
  maxPositions: number;
  posture: string;
}

export interface BreadthSeriesPoint {
  computedAt: string;
  leaderCount: number;
  totalUniverse: number;
}

export interface MarketRegimeResponse {
  state: RegimeState;
  marketHealthStatus: MarketHealthStatus;
  leaderCount: number;
  leaderCountMa: number;
  breadthSignal: BreadthSignal;
  exposureBand: ExposureBand;
  computedAt: string;
  breadthSeries: BreadthSeriesPoint[];
}
