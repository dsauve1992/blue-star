import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { TrendState } from "../api/market-breadth.types";
import { formatPercent } from "../utils/format-percent";
import { TrendBreadthChart } from "./TrendBreadthChart";

const SESSIONS_TO_SHOW = 50;

const trendBadgeVariant: Record<TrendState, "success" | "danger"> = {
  GOOD: "success",
  BAD: "danger",
};

const trendLabel: Record<TrendState, string> = {
  GOOD: "Good",
  BAD: "Bad",
};

const trendDescription: Record<TrendState, string> = {
  GOOD: "SMA5 of the stacked-MA ratio is at or above its SMA20 — short-term uptrends are broadening; fresh breakouts have support.",
  BAD: "SMA5 of the stacked-MA ratio is below its SMA20 — short-term uptrends are narrowing; be selective with new entries.",
};

export function TrendBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions ?? [];
  const latest = sessions[sessions.length - 1];
  const trend = data?.trend ?? null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trend Breadth</CardTitle>
          <div className="flex items-center gap-2">
            {latest?.partial && <Badge variant="warning">Partial</Badge>}
            {trend && (
              <Badge variant={trendBadgeVariant[trend.state]}>
                {trendLabel[trend.state]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="h-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn't load trend breadth.
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No trend breadth data yet.
          </p>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Stacked:{" "}
                <span className="font-semibold text-blue-500">
                  {latest.stackedCount === null
                    ? "—"
                    : `${latest.stackedCount} / ${latest.universeSize}`}
                </span>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Ratio:{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {formatPercent(latest.stackedRatio)}
                </span>
              </span>
              {trend && (
                <>
                  <span className="text-slate-600 dark:text-slate-300">
                    SMA5:{" "}
                    <span className="font-semibold text-green-500">
                      {formatPercent(trend.sma5)}
                    </span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    SMA20:{" "}
                    <span className="font-semibold text-amber-500">
                      {formatPercent(trend.sma20)}
                    </span>
                  </span>
                </>
              )}
            </div>
            {trend && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {trendDescription[trend.state]}
              </p>
            )}
            <TrendBreadthChart sessions={sessions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
