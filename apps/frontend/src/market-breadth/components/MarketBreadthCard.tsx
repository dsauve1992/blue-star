import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { BreadthGauge, BreadthState } from "../api/market-breadth.types";
import { formatPercent } from "../utils/format-percent";
import { MarketBreadthChart } from "./MarketBreadthChart";

const SESSIONS_TO_SHOW = 150;

const stateBadgeVariant: Record<BreadthState, "success" | "danger"> = {
  GOOD: "success",
  BAD: "danger",
};

const stateLabel: Record<BreadthState, string> = {
  GOOD: "Good",
  BAD: "Bad",
};

const trendDescription: Record<BreadthState, string> = {
  GOOD: "EMA10 of the stacked-MA ratio is at or above its EMA20 — short-term uptrends are broadening; fresh breakouts have support.",
  BAD: "EMA10 of the stacked-MA ratio is below its EMA20 — short-term uptrends are narrowing; be selective with new entries.",
};

const newHighLowDescription: Record<BreadthState, string> = {
  GOOD: "EMA10 of NH/(NH+NL) is at or above its EMA20 — buyers are gaining control of the extremes; breakouts have a tailwind.",
  BAD: "EMA10 of NH/(NH+NL) is below its EMA20 — new lows are gaining ground; stay out regardless of index trend.",
};

const shortTermDescription: Record<BreadthState, string> = {
  GOOD: "EMA10 of the 20-day high/low ratio is at or above its EMA20 — the short-term extremes are tilting up; pullbacks are being bought.",
  BAD: "EMA10 of the 20-day high/low ratio is below its EMA20 — more names are breaking one-month lows than highs; expect breakouts to fail.",
};

function formatRatio(value: number): string {
  return value.toFixed(2);
}

interface GaugeSummaryProps {
  title: string;
  gauge: BreadthGauge | null;
  descriptions: Record<BreadthState, string>;
  format: (value: number) => string;
}

function GaugeSummary({
  title,
  gauge,
  descriptions,
  format,
}: GaugeSummaryProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </span>
        {gauge && (
          <Badge variant={stateBadgeVariant[gauge.state]}>
            {stateLabel[gauge.state]}
          </Badge>
        )}
      </div>
      {gauge ? (
        <>
          <div className="flex gap-x-4 text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              EMA10:{" "}
              <span className="font-semibold text-red-500">
                {format(gauge.ema10)}
              </span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              EMA20:{" "}
              <span className="font-semibold text-blue-500">
                {format(gauge.ema20)}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {descriptions[gauge.state]}
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Not enough history yet.
        </p>
      )}
    </div>
  );
}

export function MarketBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions ?? [];
  const latest = sessions.at(-1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Market Breadth</CardTitle>
          {latest?.partial && <Badge variant="warning">Partial</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[760px] animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn't load market breadth.
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No market breadth data yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <GaugeSummary
                title="Trend Breadth"
                gauge={data?.trend ?? null}
                descriptions={trendDescription}
                format={formatPercent}
              />
              <GaugeSummary
                title="New Highs / New Lows"
                gauge={data?.newHighLow ?? null}
                descriptions={newHighLowDescription}
                format={formatRatio}
              />
              <GaugeSummary
                title="20-Day Highs / Lows"
                gauge={data?.newHighLow20 ?? null}
                descriptions={shortTermDescription}
                format={formatRatio}
              />
            </div>
            <MarketBreadthChart sessions={sessions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
