import { useState, useMemo, useEffect } from "react";
import { PageContainer } from "src/global/design-system";
import { Card, Button, LoadingSpinner, Alert } from "src/global/design-system";
import { useSectorRotation } from "../hooks/use-sector-rotation";
import { useCompareSectorRotation } from "../hooks/use-compare-sector-rotation";
import { SectorRotationRRGChart } from "../components/SectorRotationRRGChart";
import { SectorRotationTimeline } from "../components/SectorRotationTimeline";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

const DEFAULT_SECTORS = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLI", name: "Industrial" },
  { symbol: "XLY", name: "Consumer Discretionary" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLV", name: "Healthcare" },
  { symbol: "XLF", name: "Financial" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLRE", name: "Real Estate" },
  { symbol: "XLC", name: "Communication Services" },
];

export default function SectorRotation() {
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [enabledSectors, setEnabledSectors] = useState<Set<string>>(new Set());

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 52 * 7);

  const [showComparison, setShowComparison] = useState(false);

  const { data, isLoading, error, refetch } = useSectorRotation({
    sectors: DEFAULT_SECTORS,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  });

  const {
    data: comparisonData,
    isLoading: isComparing,
    error: comparisonError,
    refetch: refetchComparison,
  } = useCompareSectorRotation(
    {
      sectors: DEFAULT_SECTORS,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
    showComparison,
  );

  const uniqueDates = useMemo(() => {
    if (!data?.result?.dataPoints) return [];
    const dates = Array.from(new Set(data.result.dataPoints.map((p) => p.date)))
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    return dates;
  }, [data?.result?.dataPoints]);

  const availableSectors = useMemo(() => {
    if (!data?.result?.dataPoints) return [];
    return Array.from(
      new Set(data.result.dataPoints.map((p) => p.sectorSymbol)),
    ).sort();
  }, [data?.result?.dataPoints]);

  useEffect(() => {
    if (availableSectors.length > 0 && enabledSectors.size === 0) {
      setEnabledSectors(new Set(availableSectors));
    }
  }, [availableSectors, enabledSectors.size]);

  const handleToggleSector = (sectorSymbol: string) => {
    setEnabledSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorSymbol)) {
        next.delete(sectorSymbol);
      } else {
        next.add(sectorSymbol);
      }
      return next;
    });
  };

  const fullRange = useMemo(() => {
    if (uniqueDates.length === 0) return { start: null, end: null, weeks: [] };

    const latestDate = uniqueDates[uniqueDates.length - 1];
    const endWeek = new Date(latestDate);
    endWeek.setDate(endWeek.getDate() - endWeek.getDay());

    const weeks: Date[] = [];
    for (let i = 51; i >= 0; i--) {
      const weekStart = new Date(endWeek);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weeks.push(weekStart);
    }

    return {
      start: weeks[0],
      end: endWeek,
      weeks,
    };
  }, [uniqueDates]);

  const initialTimeWindow = useMemo(() => {
    if (uniqueDates.length === 0 || !fullRange.weeks.length)
      return { start: null, end: null, sliderPosition: 0 };

    const startWeek = fullRange.weeks[Math.max(0, fullRange.weeks.length - 5)];

    const endDate = uniqueDates[uniqueDates.length - 1];
    const startDate =
      uniqueDates.find((date) => date.getTime() >= startWeek.getTime()) ||
      uniqueDates[0];

    return {
      start: startDate,
      end: endDate,
      sliderPosition: Math.max(0, fullRange.weeks.length - 5),
    };
  }, [uniqueDates, fullRange]);

  const [sliderPosition, setSliderPosition] = useState<number>(0);

  useEffect(() => {
    if (
      initialTimeWindow.start &&
      initialTimeWindow.end &&
      initialTimeWindow.sliderPosition !== undefined
    ) {
      if (!selectedStartDate || !selectedEndDate) {
        setSelectedStartDate(initialTimeWindow.start);
        setSelectedEndDate(initialTimeWindow.end);
        setSliderPosition(initialTimeWindow.sliderPosition);
      }
    }
  }, [
    initialTimeWindow.start,
    initialTimeWindow.end,
    initialTimeWindow.sliderPosition,
    selectedStartDate,
    selectedEndDate,
  ]);

  const handleSliderChange = (position: number) => {
    if (!fullRange.weeks.length) return;

    setSliderPosition(position);
    const windowSize = 5;
    const startWeekIndex = position;
    const endWeekIndex = Math.min(
      position + windowSize - 1,
      fullRange.weeks.length - 1,
    );

    const startWeek = fullRange.weeks[startWeekIndex];
    const endWeek = fullRange.weeks[endWeekIndex];

    if (startWeek && endWeek) {
      const weekEndDate = new Date(endWeek);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      const actualStartDate =
        uniqueDates.find((date) => date.getTime() >= startWeek.getTime()) ||
        startWeek;

      const actualEndDate =
        uniqueDates.find((date) => date.getTime() >= weekEndDate.getTime()) ||
        uniqueDates[uniqueDates.length - 1] ||
        weekEndDate;

      setSelectedStartDate(actualStartDate);
      setSelectedEndDate(actualEndDate);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert variant="danger">
          Error loading sector rotation data: {error.message}
        </Alert>
      </PageContainer>
    );
  }

  if (!data?.result) {
    return (
      <PageContainer>
        <Alert variant="warning">No data available</Alert>
      </PageContainer>
    );
  }

  const displayStartDate = selectedStartDate || initialTimeWindow.start;
  const displayEndDate = selectedEndDate || initialTimeWindow.end;

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sector Rotation Analysis</h1>
            <p className="text-muted-foreground mt-2">
              Relative Rotation Graph (RRG) and quadrant timeline for sector
              ETFs
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? "Hide" : "Show"} Comparison
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {fullRange.weeks.length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium mb-1">Time Window</h3>
                  <p className="text-xs text-muted-foreground">
                    {displayStartDate && displayEndDate
                      ? `${displayStartDate.toLocaleDateString()} - ${displayEndDate.toLocaleDateString()}`
                      : "Select a time window"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Week {sliderPosition + 1} -{" "}
                  {Math.min(sliderPosition + 5, fullRange.weeks.length)} of{" "}
                  {fullRange.weeks.length}
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, fullRange.weeks.length - 5)}
                  value={sliderPosition}
                  onChange={(e) =>
                    handleSliderChange(parseInt(e.target.value, 10))
                  }
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(sliderPosition / Math.max(1, fullRange.weeks.length - 5)) * 100}%, #e5e7eb ${(sliderPosition / Math.max(1, fullRange.weeks.length - 5)) * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <style>{`
                  input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                  input[type="range"]:focus {
                    outline: none;
                  }
                  input[type="range"]:focus::-webkit-slider-thumb {
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
                  }
                `}</style>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {fullRange.start ? fullRange.start.toLocaleDateString() : ""}
                </span>
                <span>
                  {fullRange.end ? fullRange.end.toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <SectorRotationRRGChart
            dataPoints={data.result.dataPoints}
            trailWeeks={12}
            startDate={displayStartDate}
            endDate={displayEndDate}
            enabledSectors={enabledSectors}
          />
        </Card>

        <SectorRotationTimeline
          dataPoints={data.result.dataPoints}
          enabledSectors={enabledSectors}
          onToggleSector={handleToggleSector}
        />

        {showComparison && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Persisted vs Live Comparison
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare database-persisted data with live computation
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchComparison()}
                  disabled={isComparing}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isComparing ? "animate-spin" : ""}`}
                  />
                  Refresh Comparison
                </Button>
              </div>

              {isComparing && (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              )}

              {comparisonError && (
                <Alert variant="danger">
                  Error loading comparison:{" "}
                  {comparisonError instanceof Error
                    ? comparisonError.message
                    : "Unknown error"}
                </Alert>
              )}

              {comparisonData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Total Data Points
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {comparisonData.summary.totalDataPoints}
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Matching
                      </div>
                      <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                        {comparisonData.summary.matchingDataPoints}
                      </div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        Different
                      </div>
                      <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                        {comparisonData.summary.differentDataPoints}
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Match Rate
                      </div>
                      <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                        {comparisonData.summary.totalDataPoints > 0
                          ? (
                              (comparisonData.summary.matchingDataPoints /
                                comparisonData.summary.totalDataPoints) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  {comparisonData.summary.maxDifference.x > 0.0001 ||
                  comparisonData.summary.maxDifference.y > 0.0001 ||
                  comparisonData.summary.maxDifference.relativeStrength >
                    0.0001 ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                          Maximum Differences Found
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-muted-foreground">X</div>
                          <div className="text-lg font-semibold">
                            {comparisonData.summary.maxDifference.x.toFixed(6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Y</div>
                          <div className="text-lg font-semibold">
                            {comparisonData.summary.maxDifference.y.toFixed(6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Relative Strength
                          </div>
                          <div className="text-lg font-semibold">
                            {comparisonData.summary.maxDifference.relativeStrength.toFixed(
                              6,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h3 className="font-semibold text-green-900 dark:text-green-100">
                          All data points match perfectly!
                        </h3>
                      </div>
                    </div>
                  )}

                  {comparisonData.summary.differentDataPoints > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Differences Details</h3>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Sector</th>
                              <th className="text-right p-2">Δ X</th>
                              <th className="text-right p-2">Δ Y</th>
                              <th className="text-right p-2">Δ RS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.differences
                              .filter(
                                (diff) =>
                                  Math.abs(diff.differences.x) > 0.0001 ||
                                  Math.abs(diff.differences.y) > 0.0001 ||
                                  Math.abs(
                                    diff.differences.relativeStrength,
                                  ) > 0.0001,
                              )
                              .map((diff, idx) => (
                                <tr
                                  key={`${diff.date}-${diff.sectorSymbol}-${idx}`}
                                  className="border-t border-slate-200 dark:border-slate-700"
                                >
                                  <td className="p-2">
                                    {new Date(diff.date).toLocaleDateString()}
                                  </td>
                                  <td className="p-2">{diff.sectorSymbol}</td>
                                  <td className="p-2 text-right font-mono">
                                    {diff.differences.x.toFixed(6)}
                                  </td>
                                  <td className="p-2 text-right font-mono">
                                    {diff.differences.y.toFixed(6)}
                                  </td>
                                  <td className="p-2 text-right font-mono">
                                    {diff.differences.relativeStrength.toFixed(
                                      6,
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
