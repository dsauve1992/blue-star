export type MockClosedTrade = {
  symbol: string;
  won: boolean;
  rNet: number;
};

export const MOCK_CLOSED_TRADES: MockClosedTrade[] = [
  { symbol: "AAPL", won: true, rNet: 2.4 },
  { symbol: "NVDA", won: true, rNet: 1.6 },
  { symbol: "MSFT", won: false, rNet: -1 },
  { symbol: "META", won: true, rNet: 3.1 },
  { symbol: "GOOGL", won: false, rNet: -1 },
  { symbol: "AMD", won: true, rNet: 1.2 },
  { symbol: "TSLA", won: false, rNet: -1 },
  { symbol: "CRM", won: true, rNet: 2.0 },
  { symbol: "ORCL", won: true, rNet: 1.4 },
  { symbol: "INTC", won: false, rNet: -1 },
  { symbol: "QCOM", won: true, rNet: 2.8 },
  { symbol: "AVGO", won: true, rNet: 1.9 },
];

export type BookStats = {
  n: number;
  winRate: number;
  avgWinR: number | null;
  breakevenAtBookAvgR: number | null;
  expectancyRPerTrade: number | null;
};

export function summarizeBook(trades: MockClosedTrade[]): BookStats {
  const n = trades.length;
  const wins = trades.filter((t) => t.won);
  const winRate = n === 0 ? 0 : wins.length / n;
  const avgWinR =
    wins.length === 0 ? null : wins.reduce((s, t) => s + t.rNet, 0) / wins.length;
  const breakevenAtBookAvgR =
    avgWinR != null && avgWinR > 0 ? 1 / (1 + avgWinR) : null;
  const expectancyRPerTrade =
    avgWinR == null ? null : winRate * avgWinR - (1 - winRate) * 1;
  return { n, winRate, avgWinR, breakevenAtBookAvgR, expectancyRPerTrade };
}
