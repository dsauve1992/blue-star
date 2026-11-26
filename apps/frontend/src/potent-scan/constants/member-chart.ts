import type { MovingAverageConfig } from "src/market-data/utils/chart-utils";

export const CHART_EXCHANGE = "NASDAQ";

export const MEMBER_MOVING_AVERAGES: MovingAverageConfig[] = [
  { type: "EMA", length: 9 },
  { type: "EMA", length: 21 },
  { type: "EMA", length: 50, color: "#e8ff00" },
];
