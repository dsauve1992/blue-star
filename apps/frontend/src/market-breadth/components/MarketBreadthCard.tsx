import { useMemo } from "react";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { BreadthState } from "../api/market-breadth.types";
import { BreadthHighLowCard } from "./BreadthHighLowCard";

const SESSIONS_TO_SHOW = 150;

const ARIA_LABEL =
  "Two-pane chart: the 10-day and 20-day exponential moving averages of the new-high/new-low ratio, shaded blue when EMA10 is above EMA20 and red otherwise, above a mirrored histogram of daily 52-week new highs and new lows";

const stateDescription: Record<BreadthState, string> = {
  GOOD: "EMA10 of NH/(NH+NL) is at or above its EMA20 — buyers are gaining control of the extremes; breakouts have a tailwind.",
  BAD: "EMA10 of NH/(NH+NL) is below its EMA20 — new lows are gaining ground; stay out regardless of index trend.",
};

export function MarketBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions;
  const latest = sessions?.at(-1);

  const points = useMemo(
    () =>
      (sessions ?? []).map((session) => ({
        date: session.date,
        highs: session.newHighs,
        lows: session.newLows,
        ema10: session.ratioEma10,
        ema20: session.ratioEma20,
      })),
    [sessions],
  );

  return (
    <BreadthHighLowCard
      title="New Highs / New Lows"
      highsLabel="New highs"
      lowsLabel="New lows"
      descriptions={stateDescription}
      ariaLabel={ARIA_LABEL}
      gauge={data?.newHighLow ?? null}
      partial={latest?.partial ?? false}
      highs={latest?.newHighs ?? null}
      lows={latest?.newLows ?? null}
      ratio={latest?.ratio ?? null}
      points={points}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
