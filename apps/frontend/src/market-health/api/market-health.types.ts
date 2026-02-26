export type MarketHealthStatus = 'GOOD' | 'WARNING' | 'BAD';

export interface MarketHealthResponse {
  status: MarketHealthStatus;
  ema9: number;
  ema21: number;
  computedAt: string;
}
