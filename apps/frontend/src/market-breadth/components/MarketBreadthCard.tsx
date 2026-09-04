import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { BreadthState } from "../api/market-breadth.types";
import { MarketBreadthHistogram } from "./MarketBreadthHistogram";

const SESSIONS_TO_SHOW = 50;

const stateBadgeVariant: Record<BreadthState, "success" | "danger"> = {
  GOOD: "success",
  BAD: "danger",
};

const stateLabel: Record<BreadthState, string> = {
  GOOD: "Good",
  BAD: "Bad",
};

const stateDescription: Record<BreadthState, string> = {
  GOOD: "EMA10 of NH/(NH+NL) is at or above its EMA20 — buyers are gaining control of the extremes; breakouts have a tailwind.",
  BAD: "EMA10 of NH/(NH+NL) is below its EMA20 — new lows are gaining ground; stay out regardless of index trend.",
};

export function MarketBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions ?? [];
  const latest = sessions[sessions.length - 1];
  const newHighLow = data?.newHighLow ?? null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>New Highs / New Lows</CardTitle>
          <div className="flex items-center gap-2">
            {latest?.partial && <Badge variant="warning">Partial</Badge>}
            {newHighLow && (
              <Badge variant={stateBadgeVariant[newHighLow.state]}>
                {stateLabel[newHighLow.state]}
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
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No market breadth data yet.
          </p>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                New highs:{" "}
                <span className="font-semibold text-blue-500">
                  {latest.newHighs}
                </span>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                New lows:{" "}
                <span className="font-semibold text-red-500">
                  {latest.newLows}
                </span>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Ratio:{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {latest.ratio === null ? "—" : latest.ratio.toFixed(2)}
                </span>
              </span>
              {newHighLow && (
                <>
                  <span className="text-slate-600 dark:text-slate-300">
                    EMA10:{" "}
                    <span className="font-semibold text-red-500">
                      {newHighLow.ema10.toFixed(2)}
                    </span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    EMA20:{" "}
                    <span className="font-semibold text-blue-500">
                      {newHighLow.ema20.toFixed(2)}
                    </span>
                  </span>
                </>
              )}
            </div>
            {newHighLow && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stateDescription[newHighLow.state]}
              </p>
            )}
            <MarketBreadthHistogram sessions={sessions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
