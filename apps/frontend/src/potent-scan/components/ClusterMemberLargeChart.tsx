import { useMemo } from "react";
import { LoadingSpinner } from "src/global/design-system";
import { ChartLoadError } from "src/global/components/ChartLoadError";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import type { ClusterMemberDetail } from "../api/potent-scan.client";
import {
  CHART_EXCHANGE,
  MEMBER_MOVING_AVERAGES,
} from "../constants/member-chart";
import { formatTimestampDate } from "../utils/format";
import { joinMarkers } from "../utils/join-marker";
import { TierBadge } from "./TierBadge";

const LARGE_CHART_BARS = 300;
const LARGE_VISIBLE_BARS = 160;

export function ClusterMemberLargeChart({
  member,
}: {
  member: ClusterMemberDetail;
}) {
  const { candles, error, refetch } = useChartData(
    member.ticker,
    CHART_EXCHANGE,
    "D",
    LARGE_CHART_BARS,
  );
  const markers = useMemo(
    () => (candles ? joinMarkers(candles, member, "Joined") : []),
    [candles, member],
  );

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-mono text-lg font-bold text-white">
          {member.ticker}
        </h3>
        <TierBadge tier={member.tiers.at(-1)?.tier ?? null} />
        <span className="text-xs text-slate-400">
          Joined {formatTimestampDate(member.joinedAt)}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-700/50">
        {error ? (
          <ChartLoadError symbol={member.ticker} onRetry={() => refetch()} />
        ) : candles ? (
          <TechnicalChart
            key={member.ticker}
            candles={candles}
            ticker={member.ticker}
            movingAverages={MEMBER_MOVING_AVERAGES}
            visibleBars={LARGE_VISIBLE_BARS}
            volume={{ show: true }}
            markers={markers}
            showExport={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}
