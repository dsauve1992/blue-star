import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "src/global/design-system";
import { Badge } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import { useConsolidations } from "../hooks/use-consolidations";
import { useRunConsolidationAnalysis } from "../hooks/use-run-consolidation-analysis";
import type { AnalyzeConsolidationsRequest } from "../api/consolidation.client";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
} from "src/watchlist/hooks/use-watchlists";
import TradingViewTapeCardWidget from "../components/new/TradingViewTapeCardWidget";
import { FinancialReportChartFooter } from "../components/FinancialReportChartFooter";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import type { ConsolidationResult } from "../api/consolidation.client";
import { useLatestSectorStatus } from "src/sector-rotation/hooks/use-latest-sector-status";
import type {
  SectorStatus,
  QuadrantType,
} from "src/sector-rotation/api/sector-rotation.client";
import {
  RefreshCw,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Sparkles,
  BookmarkPlus,
  Check,
} from "lucide-react";

type SectorFilterMode = "off" | "filter" | "highlight";

const YFINANCE_TO_CANONICAL_SECTOR: Record<string, string> = {
  Technology: "Technology",
  Energy: "Energy",
  Industrials: "Industrial",
  "Consumer Cyclical": "Consumer Discretionary",
  "Consumer Defensive": "Consumer Staples",
  Healthcare: "Healthcare",
  "Financial Services": "Financial",
  "Basic Materials": "Materials",
  Utilities: "Utilities",
  "Real Estate": "Real Estate",
  "Communication Services": "Communication Services",
};

function normalizeSectorName(yfinanceSector: string | null): string | null {
  if (!yfinanceSector) return null;
  return YFINANCE_TO_CANONICAL_SECTOR[yfinanceSector] ?? yfinanceSector;
}

function isFavorableSector(
  sectorName: string | null,
  sectorStatuses: SectorStatus[],
): boolean {
  if (!sectorName) return false;
  const canonicalSector = normalizeSectorName(sectorName);
  if (!canonicalSector) return false;
  const status = sectorStatuses.find((s) => s.name === canonicalSector);
  if (!status) return false;
  return status.quadrant === "Leading" || status.quadrant === "Improving";
}

function getSectorQuadrant(
  sectorName: string | null,
  sectorStatuses: SectorStatus[],
): QuadrantType | null {
  if (!sectorName) return null;
  const canonicalSector = normalizeSectorName(sectorName);
  if (!canonicalSector) return null;
  const status = sectorStatuses.find((s) => s.name === canonicalSector);
  return status?.quadrant ?? null;
}

type AnalysisType = "daily" | "weekly";

import { PageContainer } from "src/global/design-system/page-container";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

const SELECT_CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1rem",
};

export default function ConsolidationAnalysis() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  // Default to daily if type is invalid or missing
  const analysisType: AnalysisType = type === "weekly" ? "weekly" : "daily";

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [sectorFilterMode, setSectorFilterMode] =
    useState<SectorFilterMode>("off");
  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const request: AnalyzeConsolidationsRequest = {
    type: analysisType,
  };

  const { data, isLoading, error, refetch } = useConsolidations(request);
  const runAnalysis = useRunConsolidationAnalysis();
  const { data: watchlistsData } = useWatchlists();
  const addTickerToWatchlist = useAddTickerToWatchlist();
  const removeTickerFromWatchlist = useRemoveTickerFromWatchlist();
  const createWatchlist = useCreateWatchlist();
  const { data: sectorStatusData } = useLatestSectorStatus();
  const symbolToFetch = selectedTicker ? extractSymbol(selectedTicker) : null;
  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
  } = useFinancialReport(symbolToFetch);

  const sectorStatuses = sectorStatusData?.sectors ?? [];

  const rawConsolidations = data?.hasData
    ? analysisType === "daily"
      ? data.daily
      : data.weekly
    : [];

  const consolidations = useMemo(() => {
    if (sectorFilterMode === "filter" && sectorStatuses.length > 0) {
      return rawConsolidations.filter((c) =>
        isFavorableSector(c.sector, sectorStatuses),
      );
    }
    return rawConsolidations;
  }, [rawConsolidations, sectorFilterMode, sectorStatuses]);

  const currentIndex = consolidations.findIndex(
    (c) => c.tickerFullName === selectedTicker,
  );

  const movingAverages = useMemo(
    () => [
      { type: "EMA" as const, length: 10 },
      { type: "EMA" as const, length: 20 },
    ],
    [],
  );

  const tradingViewProps = useMemo(() => {
    if (!selectedTicker) return null;
    return {
      exchange: selectedTicker.split(":")[0] || "NASDAQ",
      symbol: selectedTicker.split(":")[1] || selectedTicker,
      interval: (analysisType === "daily" ? "D" : "W") as "D" | "W",
      range: (analysisType === "daily" ? "6m" : "12m") as "6m" | "12m",
    };
  }, [selectedTicker, analysisType]);

  useEffect(() => {
    // Reset selection when analysis type changes
    setSelectedTicker(null);
  }, [analysisType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowWatchlistDropdown(false);
      }
    };

    if (showWatchlistDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showWatchlistDropdown]);

  useEffect(() => {
    if (data?.hasData) {
      const consolidations =
        analysisType === "daily" ? data.daily : data.weekly;
      if (consolidations.length > 0) {
        const firstTicker = consolidations[0].tickerFullName;
        if (
          !selectedTicker ||
          !consolidations.some((c) => c.tickerFullName === selectedTicker)
        ) {
          setSelectedTicker(firstTicker);
        }
      }
    }
  }, [data, analysisType]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!data?.hasData) return;

      const consolidations =
        analysisType === "daily" ? data.daily : data.weekly;

      if (consolidations.length === 0) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        const currentIndex = consolidations.findIndex(
          (c) => c.tickerFullName === selectedTicker,
        );

        if (currentIndex === -1) {
          setSelectedTicker(consolidations[0].tickerFullName);
          return;
        }

        let newIndex: number;
        if (event.key === "ArrowDown") {
          newIndex = Math.min(currentIndex + 1, consolidations.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        const newTicker = consolidations[newIndex].tickerFullName;
        setSelectedTicker(newTicker);

        const tickerElement = tickerRefs.current.get(newTicker);
        if (tickerElement && listContainerRef.current) {
          tickerElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [data, analysisType, selectedTicker]);

  const handleTypeChange = (newType: AnalysisType) => {
    navigate(`/stock-analysis/${newType}`);
  };

  const handleRunAnalysis = async () => {
    try {
      await runAnalysis.mutateAsync({ type: analysisType });
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (err) {
      console.error("Failed to run analysis:", err);
    }
  };

  const handleTickerSelect = (tickerFullName: string) => {
    setSelectedTicker(tickerFullName);
    const tickerElement = tickerRefs.current.get(tickerFullName);
    if (tickerElement && listContainerRef.current) {
      tickerElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

  const navigateTicker = (direction: "up" | "down") => {
    if (consolidations.length === 0) return;

    let newIndex: number;
    if (currentIndex === -1) {
      newIndex = 0;
    } else if (direction === "down") {
      newIndex = Math.min(currentIndex + 1, consolidations.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    const newTicker = consolidations[newIndex].tickerFullName;
    handleTickerSelect(newTicker);
  };

  const handleToggleTickerInWatchlist = async (
    watchlistId: string,
    isTickerInWatchlist: boolean,
  ) => {
    if (!selectedTicker) return;

    const tickerSymbol = extractSymbol(selectedTicker);
    const tickerToUse =
      watchlistsData?.watchlists
        .find((w) => w.id === watchlistId)
        ?.tickers.find((t) => t === selectedTicker || t === tickerSymbol) ||
      selectedTicker;

    try {
      if (isTickerInWatchlist) {
        await removeTickerFromWatchlist.mutateAsync({
          watchlistId,
          ticker: tickerToUse,
        });
      } else {
        await addTickerToWatchlist.mutateAsync({
          watchlistId,
          request: { ticker: selectedTicker },
        });
      }
    } catch (error) {
      console.error(
        `Failed to ${isTickerInWatchlist ? "remove" : "add"} ticker from watchlist:`,
        error,
      );
    }
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker || !newWatchlistName.trim()) return;

    try {
      const response = await createWatchlist.mutateAsync({
        name: newWatchlistName.trim(),
      });

      await addTickerToWatchlist.mutateAsync({
        watchlistId: response.watchlistId,
        request: { ticker: selectedTicker },
      });

      setNewWatchlistName("");
    } catch (error) {
      console.error("Failed to create watchlist:", error);
    }
  };

  const getQuadrantColor = (quadrant: QuadrantType | null) => {
    switch (quadrant) {
      case "Leading":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Improving":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Weakening":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Lagging":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const renderTickerItem = (consolidation: ConsolidationResult) => {
    const isSelected = selectedTicker === consolidation.tickerFullName;
    const symbol = extractSymbol(consolidation.symbol);
    const logoUrl = getTickerLogoUrl(symbol);
    const logoFailed = failedLogos.has(symbol);
    const sectorQuadrant = getSectorQuadrant(
      consolidation.sector,
      sectorStatuses,
    );
    const isInFavorableSector =
      sectorQuadrant === "Leading" || sectorQuadrant === "Improving";
    const shouldHighlight =
      sectorFilterMode === "highlight" && isInFavorableSector;

    return (
      <div
        key={consolidation.symbol}
        ref={(el) => {
          if (el) {
            tickerRefs.current.set(consolidation.tickerFullName, el);
          } else {
            tickerRefs.current.delete(consolidation.tickerFullName);
          }
        }}
        onClick={() => handleTickerSelect(consolidation.tickerFullName)}
        className={`
          group relative flex items-center overflow-hidden rounded-lg cursor-pointer
          transition-all duration-200 ease-out
          ${
            isSelected
              ? "border border-blue-500/50 shadow-md shadow-blue-500/10"
              : shouldHighlight
                ? "border border-emerald-500/30 hover:border-emerald-400/50"
                : "border border-transparent hover:border-slate-600/50"
          }
        `}
      >
        {/* Company logo as card background */}
        {!logoFailed ? (
          <>
            <img
              src={logoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
              onError={() => {
                setFailedLogos((prev) => new Set(prev).add(symbol));
              }}
            />
            <div
              className={`absolute inset-0 pointer-events-none ${
                isSelected
                  ? "bg-gradient-to-r from-slate-900 via-slate-900/92 to-blue-900/40"
                  : shouldHighlight
                    ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-900/50"
                    : "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/70"
              }`}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-600/40 select-none">
              {symbol.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Ticker Info */}
        <div className="relative z-10 flex-1 min-w-0 p-2">
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className={`font-semibold text-xs truncate ${isSelected ? "text-white" : "text-slate-100"}`}
            >
              {consolidation.symbol}
            </span>
            {consolidation.isNew && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
                New
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 truncate block">
            {consolidation.tickerFullName}
          </span>
          <div className="flex flex-wrap gap-0.5 mt-1">
            {consolidation.sector && sectorQuadrant && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getQuadrantColor(sectorQuadrant)}`}
              >
                {sectorQuadrant}
              </span>
            )}
            {consolidation.themes && consolidation.themes.length > 0 && (
              <>
                {consolidation.themes.slice(0, 1).map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-[80px]"
                  >
                    {theme}
                  </span>
                ))}
                {consolidation.themes.length > 1 && (
                  <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
                    +{consolidation.themes.length - 1}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-l-full" />
        )}
      </div>
    );
  };

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI5M2MiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0tNiA2aC0ydi00aDJ2NHptMC02aC0ydi00aDJ2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30 pointer-events-none" />

        <div className="relative flex h-screen">
          {/* Left Sidebar - Ticker List */}
          <aside className="w-56 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-700/50 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-white truncate">
                    Consolidation Analysis
                  </h1>
                  <p className="text-[10px] text-slate-400">
                    Technical patterns
                  </p>
                </div>
              </div>

              {/* Timeframe & Sector Filter – compact selects */}
              <div className="grid grid-cols-1 gap-2">
                <label className="block">
                  <span className="sr-only">Timeframe</span>
                  <select
                    value={analysisType}
                    onChange={(e) =>
                      handleTypeChange(e.target.value as AnalysisType)
                    }
                    className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 pr-8 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
                    style={SELECT_CHEVRON_STYLE}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] text-slate-500 mb-0.5">
                    Sector
                  </span>
                  <select
                    value={sectorFilterMode}
                    onChange={(e) =>
                      setSectorFilterMode(e.target.value as SectorFilterMode)
                    }
                    className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 pr-8 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
                    style={SELECT_CHEVRON_STYLE}
                  >
                    <option value="off">Off</option>
                    <option value="filter">Filter</option>
                    <option value="highlight">Highlight</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Stats Bar */}
            {data?.hasData && (
              <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Signals</span>
                  <span className="font-semibold text-white">
                    {analysisType === "daily"
                      ? data.dailyCount
                      : data.weeklyCount}
                  </span>
                </div>
              </div>
            )}

            {/* Ticker List */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
              tabIndex={0}
            >
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <LoadingSpinner />
                  <span className="text-sm text-slate-400">
                    Loading consolidations...
                  </span>
                </div>
              )}

              {error && (
                <Alert variant="danger" className="m-2">
                  <AlertDescription>
                    Failed to load consolidation data. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {!isLoading &&
                !error &&
                data?.hasData &&
                consolidations.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                      <BarChart3 className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm">
                      No consolidation signals found for{" "}
                      {analysisType === "daily" ? "daily" : "weekly"} timeframe.
                    </p>
                  </div>
                )}

              {!isLoading && !error && !data?.hasData && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Alert
                    variant={
                      data?.runStatus === "failed" ? "danger" : "warning"
                    }
                    className="mb-4"
                  >
                    <AlertDescription>
                      {data?.runStatus === "running" && (
                        <>
                          Analysis is currently running. Data will be available
                          shortly.
                        </>
                      )}
                      {data?.runStatus === "failed" && (
                        <>
                          Analysis failed:{" "}
                          {data?.errorMessage || "Unknown error"}.
                        </>
                      )}
                      {data?.runStatus === "not_found" && (
                        <>No analysis has been run yet for today.</>
                      )}
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="default"
                    onClick={handleRunAnalysis}
                    disabled={runAnalysis.isPending}
                    className="mt-2"
                  >
                    {runAnalysis.isPending
                      ? "Running Analysis..."
                      : "Run Analysis Now"}
                  </Button>
                </div>
              )}

              {!isLoading &&
                !error &&
                data?.hasData &&
                consolidations.map(renderTickerItem)}
            </div>

            {/* Navigation Footer */}
            {data?.hasData && consolidations.length > 0 && (
              <div className="p-2 border-t border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => navigateTicker("up")}
                    disabled={currentIndex <= 0}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
                    bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className="text-[10px] text-slate-500 min-w-[48px] text-center">
                    {currentIndex + 1}/{consolidations.length}
                  </span>
                  <button
                    onClick={() => navigateTicker("down")}
                    disabled={currentIndex >= consolidations.length - 1}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
                    bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-1">
                  ↑↓ to navigate
                </p>
              </div>
            )}
          </aside>

          {/* Main Content - Chart Area */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Chart Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
              <div className="flex items-center gap-4 flex-wrap">
                {selectedTicker ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-700/50 overflow-hidden border border-slate-600/50 shadow-lg flex items-center justify-center">
                        {failedLogos.has(extractSymbol(selectedTicker)) ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                            <TrendingUp className="w-6 h-6 text-white" />
                          </div>
                        ) : (
                          <img
                            src={getTickerLogoUrl(
                              extractSymbol(selectedTicker),
                            )}
                            alt={extractSymbol(selectedTicker)}
                            className="w-full h-full object-contain p-1"
                            onError={() => {
                              setFailedLogos((prev) =>
                                new Set(prev).add(
                                  extractSymbol(selectedTicker),
                                ),
                              );
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {extractSymbol(selectedTicker)}
                        </h2>
                        <p className="text-sm text-slate-400">
                          {selectedTicker}
                        </p>
                      </div>
                    </div>
                    {consolidations.find(
                      (c) => c.tickerFullName === selectedTicker,
                    )?.isNew && (
                      <Badge variant="success" className="ml-2">
                        <Sparkles className="w-3 h-3 mr-1" />
                        New Signal
                      </Badge>
                    )}
                    {consolidations.find(
                      (c) => c.tickerFullName === selectedTicker,
                    )?.themes &&
                      consolidations.find(
                        (c) => c.tickerFullName === selectedTicker,
                      )!.themes.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-2">
                          {consolidations
                            .find((c) => c.tickerFullName === selectedTicker)!
                            .themes.map((theme) => (
                              <Badge
                                key={theme}
                                variant="default"
                                className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                              >
                                {theme}
                              </Badge>
                            ))}
                        </div>
                      )}
                  </>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold text-white">Chart View</h2>
                    <p className="text-sm text-slate-400">
                      Select a ticker to view chart
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedTicker && (
                  <>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWatchlistDropdown(!showWatchlistDropdown);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                        bg-blue-600/50 text-white hover:bg-blue-600/70
                        border border-blue-500/50 transition-all duration-200"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        Add to Watchlist
                      </button>

                      {showWatchlistDropdown && (
                        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-[9999] overflow-hidden">
                          {watchlistsData?.watchlists &&
                            watchlistsData.watchlists.length > 0 && (
                              <div className="p-2">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                  Select Watchlist
                                </div>
                                {watchlistsData.watchlists.map((watchlist) => {
                                  const tickerSymbol =
                                    extractSymbol(selectedTicker);
                                  const isTickerInWatchlist =
                                    watchlist.tickers.includes(
                                      selectedTicker,
                                    ) ||
                                    watchlist.tickers.includes(tickerSymbol);
                                  return (
                                    <button
                                      key={watchlist.id}
                                      onClick={() =>
                                        handleToggleTickerInWatchlist(
                                          watchlist.id,
                                          isTickerInWatchlist,
                                        )
                                      }
                                      disabled={
                                        addTickerToWatchlist.isPending ||
                                        removeTickerFromWatchlist.isPending
                                      }
                                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-slate-700/50 transition-colors
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <span className="truncate">
                                        {watchlist.name}
                                      </span>
                                      {isTickerInWatchlist && (
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                          <div className="border-t border-slate-700/50 p-2">
                            <form
                              onSubmit={handleCreateWatchlist}
                              className="space-y-2"
                            >
                              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Create New Watchlist
                              </div>
                              <input
                                type="text"
                                value={newWatchlistName}
                                onChange={(e) =>
                                  setNewWatchlistName(e.target.value)
                                }
                                placeholder="Watchlist name..."
                                maxLength={255}
                                disabled={createWatchlist.isPending}
                                className="w-full px-3 py-2 rounded-md text-sm bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500
                              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                              disabled:opacity-50 disabled:cursor-not-allowed"
                                autoFocus={
                                  watchlistsData?.watchlists &&
                                  watchlistsData.watchlists.length === 0
                                }
                              />
                              <button
                                type="submit"
                                disabled={
                                  !newWatchlistName.trim() ||
                                  createWatchlist.isPending
                                }
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                              bg-blue-600/50 text-white hover:bg-blue-600/70
                              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <BookmarkPlus className="w-4 h-4" />
                                {createWatchlist.isPending
                                  ? "Creating..."
                                  : "Create & Add"}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                  border border-slate-600/50 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </header>

            {/* Chart Content */}
            <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
              <div className="flex-1 min-h-0">
                {selectedTicker && tradingViewProps ? (
                  <div className="h-full rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl shadow-2xl">
                    <TradingViewTapeCardWidget
                      exchange={tradingViewProps.exchange}
                      symbol={tradingViewProps.symbol}
                      interval={tradingViewProps.interval}
                      range={tradingViewProps.range}
                      movingAverages={movingAverages}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-slate-700/50 border-dashed bg-slate-800/20">
                    <div className="p-6 rounded-full bg-slate-700/30 mb-6">
                      <BarChart3 className="w-16 h-16 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-300 mb-2">
                      No Ticker Selected
                    </h3>
                    <p className="text-slate-500 text-center max-w-md">
                      Select a ticker from the list on the left to view its
                      interactive chart with technical indicators.
                    </p>
                  </div>
                )}
              </div>
              {selectedTicker && (
                <FinancialReportChartFooter
                  report={financialData?.report ?? null}
                  isLoading={financialLoading}
                  error={financialError}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </PageContainer>
  );
}
