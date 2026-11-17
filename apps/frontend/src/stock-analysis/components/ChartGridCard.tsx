import { memo, useMemo, useRef, type ReactNode, type RefObject } from "react";
import type { Time } from "lightweight-charts";
import { useInViewOnce } from "../hooks/use-in-view-once";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import { LoadingSpinner } from "src/global/design-system";
import { ChartLoadError } from "./ChartLoadError";
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
    <div
      ref={cardRef}
      data-ticker={tickerId}
      className={`flex flex-col h-80 scroll-mt-12 rounded-xl overflow-hidden border bg-slate-800/30 transition-colors duration-150 ${
        isSelected
          ? "border-blue-400 ring-1 ring-blue-400/60"
          : "border-slate-700/50 hover:border-blue-500/50"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50 text-xs">
        {header}
      </div>
      <div className="relative flex-1 min-h-0">
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
        <button
          type="button"
          onClick={() => onOpen(tickerId)}
          aria-pressed={isSelected}
          className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
          aria-label={`Open ${symbol} chart`}
        />
      </div>
    </div>
  );
}

export const ChartGridCard = memo(ChartGridCardInner);
