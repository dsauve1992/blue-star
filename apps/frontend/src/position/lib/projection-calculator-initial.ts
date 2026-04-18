import type { BookStats } from "src/position/lib/risk-mock-book";

export type ProjectionInputsSnapshot = {
  portfolio: number;
  riskPct: number;
  winRatePct: number;
  rewardRisk: number;
  tradesPerYear: number;
  years: number;
};

/** Fixed reference scenario (e.g. Claude calc baseline) for dashboard comparison bars. */
export const REFERENCE_SCENARIO = { winRatePct: 30, rewardRisk: 4 } as const;

const defaults: ProjectionInputsSnapshot = {
  portfolio: 14_000,
  riskPct: 1,
  winRatePct: 30,
  rewardRisk: 4,
  tradesPerYear: 100,
  years: 10,
};

/** Map realized book stats into calculator slider defaults (wins-experience only for RR). */
export function bookStatsToProjectionSnapshot(book: BookStats): ProjectionInputsSnapshot {
  const winRatePct = Math.min(95, Math.max(5, Math.round(book.winRate * 100)));
  const rewardRisk = Math.min(
    8,
    Math.max(1, Math.round((book.avgWinR ?? defaults.rewardRisk) * 10) / 10),
  );
  const tradesFromActivity = Math.round(
    Math.min(250, Math.max(20, book.n * 10)),
  );

  return {
    ...defaults,
    winRatePct,
    rewardRisk,
    tradesPerYear: tradesFromActivity,
  };
}
