import { Card, CardContent, cn } from "../../global/design-system";
import type { JournalStats } from "../api/brokerage.client";
import {
  formatMoney,
  formatPercent,
  formatR,
  formatRatio,
  signColor,
} from "./format";

interface JournalStatsGridProps {
  stats: JournalStats;
}

interface Stat {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}

export function JournalStatsGrid({ stats }: JournalStatsGridProps) {
  const items: Stat[] = [
    {
      label: "Win rate",
      value: formatPercent(stats.winRate),
      hint: `${stats.wins} W / ${stats.losses} L`,
    },
    {
      label: "Average R:R",
      value: formatRatio(stats.averageRewardToRisk),
      hint: "avg win R ÷ avg loss R",
    },
    {
      label: "Expectancy",
      value: formatR(stats.expectancyR),
      hint: "mean R per campaign",
      tone: signColor(stats.expectancyR),
    },
    {
      label: "Total",
      value: formatR(stats.totalR),
      hint: formatMoney(stats.realizedPnl),
      tone: signColor(stats.totalR),
    },
    {
      label: "Average win",
      value: formatR(stats.averageWinR),
      tone: signColor(stats.averageWinR),
    },
    {
      label: "Average loss",
      value: formatR(stats.averageLossR),
      tone: signColor(stats.averageLossR),
    },
    {
      label: "Largest win / loss",
      value: `${formatR(stats.largestWinR)} / ${formatR(stats.largestLossR)}`,
    },
    {
      label: "Profit factor",
      value: formatRatio(stats.profitFactor),
      hint: "gross win R ÷ gross loss R",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-50",
                item.tone,
              )}
            >
              {item.value}
            </p>
            {item.hint && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {item.hint}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
