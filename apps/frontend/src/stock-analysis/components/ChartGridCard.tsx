import { memo, useMemo, useRef, type ReactNode, type RefObject } from "react";
import type { Time } from "lightweight-charts";
import { useInViewOnce } from "src/global/hooks/use-in-view-once";
import { ChartGridCardFrame } from "src/global/components/ChartGridCardFrame";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import { LoadingSpinner } from "src/global/design-system";
import { ChartLoadError } from "src/global/components/ChartLoadError";
import { buildQuadrantSegments } from "../utils/quadrant-segments";
import type { QuadrantHistoryPoint } from "src/sector-rotation/hooks/use-industry-group-quadrant-history";

const GRID_CHART_BARS = 200;
const GRID_VISIBLE_BARS = 130;
const GRID_MOVING_AVERAGES = getDefaultMovingAverages("D");

interface ChartGridCardProps {
  symbol: string;
  exchange: string;
  tickerId: string;
  header: ReactNode;
  quadrantHistory?: QuadrantHistoryPoint[];
  scrollRootRef: RefObject<HTMLElement | null>;
  isSelected?: boolean;
  onOpen: (tickerId: string) => void;
}

function ChartGridCardInner({
  symbol,
  exchange,
  tickerId,
  header,
  quadrantHistory,
  scrollRootRef,
  isSelected = false,
  onOpen,
}: ChartGridCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(cardRef, scrollRootRef);
  const { candles, error, refetch } = useChartData(
    inView ? symbol : null,
    inView ? exchange : null,
    "D",
    GRID_CHART_BARS,
  );
  const quadrantBackground = useMemo(
    () =>
      quadrantHistory && candles
        ? {
            segments: buildQuadrantSegments(
              quadrantHistory,
              candles.map((c) => c.time as Time),
            ),
            show: true,
          }
        : undefined,
    [quadrantHistory, candles],
  );

  return (
    <ChartGridCardFrame
      cardRef={cardRef}
      symbol={symbol}
      tickerId={tickerId}
      header={header}
      isSelected={isSelected}
      onOpen={onOpen}
    >
      {error ? (
        <ChartLoadError symbol={symbol} onRetry={() => refetch()} />
      ) : candles ? (
        <TechnicalChart
          candles={candles}
          ticker={symbol}
          exchange={exchange}
          movingAverages={GRID_MOVING_AVERAGES}
          visibleBars={GRID_VISIBLE_BARS}
          volume={{ show: true }}
          showLegend={false}
          showTooltip={false}
          showExport={false}
          quadrantBackground={quadrantBackground}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </ChartGridCardFrame>
  );
}

export const ChartGridCard = memo(ChartGridCardInner);
