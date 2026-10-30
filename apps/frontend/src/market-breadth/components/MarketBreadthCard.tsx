import { RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { BreadthGauge, BreadthState } from "../api/market-breadth.types";
import { formatPercent } from "../utils/format-percent";
import { formatSessionDate } from "../utils/format-session-date";
import {
  EMA10_COLOR,
  EMA20_COLOR,
  MarketBreadthChart,
} from "./MarketBreadthChart";

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

function formatSigned(value: number, digits: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
}

function formatRatioGap(gap: number): string {
  return formatSigned(gap, 3);
}

function formatPercentGap(gap: number): string {
  return `${formatSigned(gap * 100, 2)} pts`;
}

interface GaugeSummaryProps {
  title: string;
  gauge: BreadthGauge | null;
  descriptions: Record<BreadthState, string>;
  format: (value: number) => string;
  formatGap: (gap: number) => string;
}

function GaugeSummary({
  title,
  gauge,
  descriptions,
  format,
  formatGap,
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
          <div className="flex flex-wrap gap-x-4 text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              <span
                aria-hidden
                className="mr-1 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: EMA10_COLOR }}
              />
              EMA10:{" "}
              <span className="font-semibold">{format(gauge.ema10)}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <span
                aria-hidden
                className="mr-1 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: EMA20_COLOR }}
              />
              EMA20:{" "}
              <span className="font-semibold">{format(gauge.ema20)}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              Gap:{" "}
              <span className="font-semibold">
                {formatGap(gauge.ema10 - gauge.ema20)}
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
  const { data, isLoading, isError, refetch } =
    useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions ?? [];
  const latest = sessions.at(-1);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <CardTitle>Market Breadth</CardTitle>
          {latest && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                As of {formatSessionDate(latest.date)}
              </span>
              {latest.partial && <Badge variant="warning">Partial</Badge>}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[760px] animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Couldn't load market breadth.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
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
                formatGap={formatPercentGap}
              />
              <GaugeSummary
                title="New Highs / New Lows"
                gauge={data?.newHighLow ?? null}
                descriptions={newHighLowDescription}
                format={formatRatio}
                formatGap={formatRatioGap}
              />
              <GaugeSummary
                title="20-Day Highs / Lows"
                gauge={data?.newHighLow20 ?? null}
                descriptions={shortTermDescription}
                format={formatRatio}
                formatGap={formatRatioGap}
              />
            </div>
            <MarketBreadthChart sessions={sessions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
