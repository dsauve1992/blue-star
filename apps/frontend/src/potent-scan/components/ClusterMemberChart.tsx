import { useMemo, useRef } from "react";
import { LoadingSpinner } from "src/global/design-system";
import { ChartLoadError } from "src/global/components/ChartLoadError";
import { useInViewOnce } from "src/global/hooks/use-in-view-once";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import type { ClusterMemberDetail } from "../api/potent-scan.client";
import {
  CHART_EXCHANGE,
  MEMBER_MOVING_AVERAGES,
} from "../constants/member-chart";
import { joinMarkers } from "../utils/join-marker";

const CHART_BARS = 200;
const VISIBLE_BARS = 130;

export function ClusterMemberChart({
  member,
}: {
  member: ClusterMemberDetail;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRootRef = useRef<HTMLElement>(null);
  const inView = useInViewOnce(frameRef, viewportRootRef);
  const { candles, error, refetch } = useChartData(
    inView ? member.ticker : null,
    inView ? CHART_EXCHANGE : null,
    "D",
    CHART_BARS,
  );
  const markers = useMemo(
    () => (candles ? joinMarkers(candles, member) : []),
    [candles, member],
  );

  return (
    <div
      ref={frameRef}
      className="h-56 overflow-hidden rounded-md border border-slate-700 bg-slate-900"
    >
      {error ? (
        <ChartLoadError symbol={member.ticker} onRetry={() => refetch()} />
      ) : candles ? (
        <div
          role="img"
          aria-label={`${member.ticker} daily price chart`}
          className="pointer-events-none h-full"
        >
          <TechnicalChart
            candles={candles}
            ticker={member.ticker}
            movingAverages={MEMBER_MOVING_AVERAGES}
            visibleBars={VISIBLE_BARS}
            volume={{ show: true }}
            markers={markers}
            showLegend={false}
            showTooltip={false}
            showExport={false}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
