import { useState, useMemo, useEffect } from "react";
import { PageContainer } from "src/global/design-system";
import { Card, Button, LoadingSpinner, Alert } from "src/global/design-system";
import { useSectorRotation } from "../hooks/use-sector-rotation";
import { SectorRotationRRGChart } from "../components/SectorRotationRRGChart";
import { SectorRotationTimeline } from "../components/SectorRotationTimeline";
import { RefreshCw, Settings } from "lucide-react";

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
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [enabledSectors, setEnabledSectors] = useState<Set<string>>(new Set());

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 52 * 7);

  const { data, isLoading, error, refetch } = useSectorRotation({
    sectors: DEFAULT_SECTORS,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  });

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
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {showSettings && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              Calculation Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="text-sm text-muted-foreground">
                <p>RRG Parameters (from RRGPy library):</p>
                <ul className="list-disc list-inside mt-1">
                  <li>RS Smoothing (EMA): 5 weeks</li>
                  <li>Normalization Window: 14 weeks</li>
                  <li>Momentum Period: 1 week</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

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
      </div>
    </PageContainer>
  );
}
