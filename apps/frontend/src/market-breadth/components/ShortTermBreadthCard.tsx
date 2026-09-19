import { useMemo } from "react";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import type { BreadthState } from "../api/market-breadth.types";
import { BreadthHighLowCard } from "./BreadthHighLowCard";

const SESSIONS_TO_SHOW = 150;

const ARIA_LABEL =
  "Two-pane chart: the 10-day and 20-day exponential moving averages of the 20-day high/low ratio, shaded blue when EMA10 is above EMA20 and red otherwise, above a mirrored histogram of daily 20-day highs and 20-day lows";

const stateDescription: Record<BreadthState, string> = {
  GOOD: "EMA10 of the 20-day high/low ratio is at or above its EMA20 — the short-term extremes are tilting up; pullbacks are being bought.",
  BAD: "EMA10 of the 20-day high/low ratio is below its EMA20 — more names are breaking one-month lows than highs; expect breakouts to fail.",
};

export function ShortTermBreadthCard() {
  const { data, isLoading, isError } = useMarketBreadth(SESSIONS_TO_SHOW);
  const sessions = data?.sessions;
  const latest = sessions?.at(-1);

  const points = useMemo(
    () =>
      (sessions ?? []).map((session) => ({
        date: session.date,
        highs: session.newHighs20,
        lows: session.newLows20,
        ema10: session.ratio20Ema10,
        ema20: session.ratio20Ema20,
      })),
    [sessions],
  );

  return (
    <BreadthHighLowCard
      title="20-Day Highs / Lows"
      highsLabel="20-day highs"
      lowsLabel="20-day lows"
      descriptions={stateDescription}
      ariaLabel={ARIA_LABEL}
      gauge={data?.newHighLow20 ?? null}
      partial={latest?.partial ?? false}
      highs={latest?.newHighs20 ?? null}
      lows={latest?.newLows20 ?? null}
      ratio={latest?.ratio20 ?? null}
      points={points}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
