export interface PaperTradeContextApiDto {
  industryGroup: string | null;
  globalRsRating: number | null;
  industryGroupRsRating: number | null;
  industryGroupQuadrant: string | null;
}

export interface PaperTradeApiDto {
  id: string;
  ticker: string;
  status: string;
  shares: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  riskPerShare: number;
  exitPrice: number | null;
  exitReason: string | null;
  realizedR: number | null;
  pnl: number | null;
  marketDate: string;
  openedAt: string;
  closedAt: string | null;
  context: PaperTradeContextApiDto;
}

export interface PaperTradingStatsApiDto {
  startingEquity: number;
  currentEquity: number;
  openCount: number;
  closedCount: number;
  winners: number;
  losers: number;
  winRate: number;
  averageR: number;
  expectancyR: number;
  totalPnl: number;
}
