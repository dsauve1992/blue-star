export interface MarketRegimeApiResponseDto {
  state: string; // GREEN/YELLOW/RED
  marketHealthStatus: string; // GOOD/WARNING/BAD
  leaderCount: number;
  leaderCountMa: number;
  breadthSignal: string; // EXPANDING/NEUTRAL/CONTRACTING
  exposureBand: {
    perTradeRiskPct: number;
    maxPortfolioHeatPct: number;
    maxSectorHeatPct: number;
    maxPositions: number;
    posture: string;
  };
  computedAt: string;
  breadthSeries: Array<{
    computedAt: string;
    leaderCount: number;
    totalUniverse: number;
  }>;
}
