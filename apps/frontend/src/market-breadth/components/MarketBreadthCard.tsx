import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import { MarketBreadthHistogram } from "./MarketBreadthHistogram";

const SESSIONS_TO_SHOW = 50;

export function MarketBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions ?? [];
  const latest = sessions[sessions.length - 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>New Highs / New Lows</CardTitle>
          {latest?.partial && <Badge variant="warning">Partial</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn't load market breadth.
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No market breadth data yet.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-sm">
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
            </div>
            <MarketBreadthHistogram sessions={sessions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
