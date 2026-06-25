export type PaperTradeStatus = "OPEN" | "CLOSED";

export type PaperTradeExitReason = "STOP" | "TARGET";

export type PaperTradeQuadrant =
  | "Leading"
  | "Weakening"
  | "Lagging"
  | "Improving";

export interface PaperTradeContext {
  industryGroup: string | null;
  globalRsRating: number | null;
  industryGroupRsRating: number | null;
  industryGroupQuadrant: PaperTradeQuadrant | null;
}

export interface PaperTrade {
  id: string;
  ticker: string;
  status: PaperTradeStatus;
  shares: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  riskPerShare: number;
  exitPrice: number | null;
  exitReason: PaperTradeExitReason | null;
  realizedR: number | null;
  pnl: number | null;
  marketDate: string;
  openedAt: string;
  closedAt: string | null;
  context: PaperTradeContext;
}

export interface PaperTradingStats {
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
