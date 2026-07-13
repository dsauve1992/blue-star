import type { PaperTradeStatus } from "../api/paper-trading.types";

export const PAPER_TRADING_QUERY_KEYS = {
  all: ["paper-trading"] as const,
  stats: () => [...PAPER_TRADING_QUERY_KEYS.all, "stats"] as const,
  trades: (status?: PaperTradeStatus) =>
    [...PAPER_TRADING_QUERY_KEYS.all, "trades", status ?? "all"] as const,
  dailyChart: (tradeId: string) =>
    [...PAPER_TRADING_QUERY_KEYS.all, "daily-chart", tradeId] as const,
  intradayChart: (tradeId: string) =>
    [...PAPER_TRADING_QUERY_KEYS.all, "intraday-chart", tradeId] as const,
} as const;
