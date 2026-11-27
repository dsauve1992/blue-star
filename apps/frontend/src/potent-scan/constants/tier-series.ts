import type { DailyTierCounts } from "../api/potent-scan.client";

export const TIER_SERIES = [
  {
    label: "Lag",
    color: "#ef4444",
    total: (day: DailyTierCounts) => day.lead + day.mediocre + day.lag,
    count: (day: DailyTierCounts) => day.lag,
  },
  {
    label: "Mediocre",
    color: "#f59e0b",
    total: (day: DailyTierCounts) => day.lead + day.mediocre,
    count: (day: DailyTierCounts) => day.mediocre,
  },
  {
    label: "Lead",
    color: "#22c55e",
    total: (day: DailyTierCounts) => day.lead,
    count: (day: DailyTierCounts) => day.lead,
  },
] as const;
