import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import type { BreadthGauge, BreadthState } from "../api/market-breadth.types";
import {
  MarketBreadthHistogram,
  type BreadthHighLowPoint,
} from "./MarketBreadthHistogram";

const stateBadgeVariant: Record<BreadthState, "success" | "danger"> = {
  GOOD: "success",
  BAD: "danger",
};

const stateLabel: Record<BreadthState, string> = {
  GOOD: "Good",
  BAD: "Bad",
};

interface BreadthHighLowCardProps {
  title: string;
  highsLabel: string;
  lowsLabel: string;
  descriptions: Record<BreadthState, string>;
  ariaLabel: string;
  gauge: BreadthGauge | null;
  partial: boolean;
  highs: number | null;
  lows: number | null;
  ratio: number | null;
  points: BreadthHighLowPoint[];
  isLoading: boolean;
  isError: boolean;
}

export function BreadthHighLowCard({
  title,
  highsLabel,
  lowsLabel,
  descriptions,
  ariaLabel,
  gauge,
  partial,
  highs,
  lows,
  ratio,
  points,
  isLoading,
  isError,
}: BreadthHighLowCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {partial && <Badge variant="warning">Partial</Badge>}
            {gauge && (
              <Badge variant={stateBadgeVariant[gauge.state]}>
                {stateLabel[gauge.state]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="h-72 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn't load market breadth.
          </p>
        ) : points.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No market breadth data yet.
          </p>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {highsLabel}:{" "}
                <span className="font-semibold text-blue-500">
                  {highs ?? "—"}
                </span>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {lowsLabel}:{" "}
                <span className="font-semibold text-red-500">
                  {lows ?? "—"}
                </span>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Ratio:{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {ratio === null ? "—" : ratio.toFixed(2)}
                </span>
              </span>
              {gauge && (
                <>
                  <span className="text-slate-600 dark:text-slate-300">
                    EMA10:{" "}
                    <span className="font-semibold text-red-500">
                      {gauge.ema10.toFixed(2)}
                    </span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    EMA20:{" "}
                    <span className="font-semibold text-blue-500">
                      {gauge.ema20.toFixed(2)}
                    </span>
                  </span>
                </>
              )}
            </div>
            {gauge && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {descriptions[gauge.state]}
              </p>
            )}
            <MarketBreadthHistogram points={points} ariaLabel={ariaLabel} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
