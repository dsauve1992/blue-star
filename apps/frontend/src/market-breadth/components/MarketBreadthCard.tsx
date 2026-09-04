import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { ParticipationRegime } from "../api/market-breadth.types";
import { MarketBreadthHistogram } from "./MarketBreadthHistogram";

const SESSIONS_TO_SHOW = 50;

const regimeBadgeVariant: Record<
  ParticipationRegime,
  "success" | "warning" | "danger"
> = {
  GREEN: "success",
  YELLOW: "warning",
  RED: "danger",
};

const regimeLabel: Record<ParticipationRegime, string> = {
  GREEN: "Go",
  YELLOW: "Caution",
  RED: "No-go",
};

const regimeDescription: Record<ParticipationRegime, string> = {
  GREEN:
    "5-day NH/(NH+NL) ≥ 0.60 — buyers control the extremes; breakouts have a tailwind.",
  YELLOW:
    "5-day NH/(NH+NL) between 0.40 and 0.60 — conflicted market; hold winners, don't add.",
  RED: "5-day NH/(NH+NL) < 0.40 — new lows dominate; stay out regardless of index trend.",
};

export function MarketBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions ?? [];
  const latest = sessions[sessions.length - 1];
  const participation = data?.participation ?? null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>New Highs / New Lows</CardTitle>
          <div className="flex items-center gap-2">
            {latest?.partial && <Badge variant="warning">Partial</Badge>}
            {participation && (
              <Badge variant={regimeBadgeVariant[participation.regime]}>
                {regimeLabel[participation.regime]}
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
              {participation && (
                <span className="text-slate-600 dark:text-slate-300">
                  5-day avg:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {participation.averageRatio.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
            {participation && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {regimeDescription[participation.regime]}
              </p>
            )}
            <MarketBreadthHistogram sessions={sessions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
