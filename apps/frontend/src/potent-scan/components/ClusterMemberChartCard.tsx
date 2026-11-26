import { memo, useMemo, useRef, type RefObject } from "react";
import { LoadingSpinner } from "src/global/design-system";
import { ChartGridCardFrame } from "src/global/components/ChartGridCardFrame";
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
import { TierBadge } from "./TierBadge";

const GRID_CHART_BARS = 200;
const GRID_VISIBLE_BARS = 130;

interface ClusterMemberChartCardProps {
  member: ClusterMemberDetail;
  scrollRootRef: RefObject<HTMLElement | null>;
  isSelected: boolean;
  onOpen: (ticker: string) => void;
}

function ClusterMemberChartCardInner({
  member,
  scrollRootRef,
  isSelected,
  onOpen,
}: ClusterMemberChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(cardRef, scrollRootRef);
  const { candles, error, refetch } = useChartData(
    inView ? member.ticker : null,
    inView ? CHART_EXCHANGE : null,
    "D",
    GRID_CHART_BARS,
  );
  const markers = useMemo(
    () => (candles ? joinMarkers(candles, member) : []),
    [candles, member],
  );

  return (
    <ChartGridCardFrame
      cardRef={cardRef}
      symbol={member.ticker}
      tickerId={member.ticker}
      header={
        <>
          <span className="shrink-0 font-mono text-sm font-semibold text-white">
            {member.ticker}
          </span>
          <TierBadge tier={member.tiers.at(-1)?.tier ?? null} />
        </>
      }
      isSelected={isSelected}
      onOpen={onOpen}
    >
      {error ? (
        <ChartLoadError symbol={member.ticker} onRetry={() => refetch()} />
      ) : candles ? (
        <TechnicalChart
          candles={candles}
          ticker={member.ticker}
          movingAverages={MEMBER_MOVING_AVERAGES}
          visibleBars={GRID_VISIBLE_BARS}
          volume={{ show: true }}
          markers={markers}
          showLegend={false}
          showTooltip={false}
          showExport={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </ChartGridCardFrame>
  );
}

export const ClusterMemberChartCard = memo(ClusterMemberChartCardInner);
