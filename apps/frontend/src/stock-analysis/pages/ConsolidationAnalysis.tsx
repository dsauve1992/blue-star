import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "src/global/design-system";
import { Badge } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import { useConsolidations } from "../hooks/use-consolidations";
import { useRunConsolidationAnalysis } from "../hooks/use-run-consolidation-analysis";
import type { AnalyzeConsolidationsRequest } from "../api/consolidation.client";
import TradingViewTapeCardWidget from "../components/new/TradingViewTapeCardWidget";
import type { ConsolidationResult } from "../api/consolidation.client";
import {
  RefreshCw,
  TrendingUp,
  Calendar,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Sparkles,
} from "lucide-react";

type AnalysisType = "daily" | "weekly";

import { PageContainer } from "src/global/design-system/page-container";

export default function ConsolidationAnalysis() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  // Default to daily if type is invalid or missing
  const analysisType: AnalysisType = (type === "weekly" ? "weekly" : "daily");

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const request: AnalyzeConsolidationsRequest = {
    type: analysisType,
  };

  const { data, isLoading, error, refetch } = useConsolidations(request);
  const runAnalysis = useRunConsolidationAnalysis();

  const consolidations = data?.hasData
    ? analysisType === "daily"
      ? data.daily
      : data.weekly
    : [];

  const currentIndex = consolidations.findIndex(
    (c) => c.tickerFullName === selectedTicker,
  );

  useEffect(() => {
    // Reset selection when analysis type changes
    setSelectedTicker(null);
  }, [analysisType]);

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

  const renderTickerItem = (consolidation: ConsolidationResult) => {
    const isSelected = selectedTicker === consolidation.tickerFullName;

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
          group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer
          transition-all duration-200 ease-out
          ${isSelected
            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 shadow-lg shadow-blue-500/10"
            : "hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50"
          }
        `}
      >
        {/* Ticker Symbol */}
        <div
          className={`
          flex items-center justify-center w-12 h-12 rounded-lg font-bold text-sm
          transition-all duration-200
          ${isSelected
              ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
              : "bg-slate-700 text-slate-300 group-hover:bg-slate-600"
            }
        `}
        >
          {consolidation.symbol.slice(0, 4)}
        </div>

        {/* Ticker Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-semibold truncate ${isSelected ? "text-white" : "text-slate-100"}`}
            >
              {consolidation.symbol}
            </span>
            {consolidation.isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 truncate block">
            {consolidation.tickerFullName}
          </span>
          {consolidation.themes && consolidation.themes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {consolidation.themes.slice(0, 2).map((theme) => (
                <span
                  key={theme}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                >
                  {theme}
                </span>
              ))}
              {consolidation.themes.length > 2 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
                  +{consolidation.themes.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-l-full" />
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
          <aside className="w-80 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Consolidation Analysis
                  </h1>
                  <p className="text-xs text-slate-400">
                    Technical pattern detection
                  </p>
                </div>
              </div>

              {/* Analysis Type Toggle */}
              <div className="flex gap-2 p-1 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <button
                  onClick={() => handleTypeChange("daily")}
                  className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${analysisType === "daily"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }
                `}
                >
                  <TrendingUp className="w-4 h-4" />
                  Daily
                </button>
                <button
                  onClick={() => handleTypeChange("weekly")}
                  className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${analysisType === "weekly"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }
                `}
                >
                  <Calendar className="w-4 h-4" />
                  Weekly
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            {data?.hasData && (
              <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Signals</span>
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
              className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
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
                    variant={data?.runStatus === "failed" ? "danger" : "warning"}
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
                          Analysis failed: {data?.errorMessage || "Unknown error"}
                          .
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
              <div className="p-3 border-t border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigateTicker("up")}
                    disabled={currentIndex <= 0}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Prev
                  </button>
                  <span className="text-xs text-slate-500 min-w-[60px] text-center">
                    {currentIndex + 1} / {consolidations.length}
                  </span>
                  <button
                    onClick={() => navigateTicker("down")}
                    disabled={currentIndex >= consolidations.length - 1}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Use ↑↓ arrow keys to navigate
                </p>
              </div>
            )}
          </aside>

          {/* Main Content - Chart Area */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Chart Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
              <div className="flex items-center gap-4 flex-wrap">
                {selectedTicker ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedTicker.split(":")[1] || selectedTicker}
                        </h2>
                        <p className="text-sm text-slate-400">{selectedTicker}</p>
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
            </header>

            {/* Chart Content */}
            <div className="flex-1 p-6 overflow-hidden">
              {selectedTicker ? (
                <div className="h-full rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl shadow-2xl">
                  <TradingViewTapeCardWidget
                    exchange={selectedTicker.split(":")[0] || "NASDAQ"}
                    symbol={selectedTicker.split(":")[1] || selectedTicker}
                    interval={analysisType === "daily" ? "D" : "W"}
                    range={analysisType === "daily" ? "6m" : "12m"}
                    movingAverages={[
                      { type: "EMA", length: 10 },
                      { type: "EMA", length: 20 },
                    ]}
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
          </main>
        </div>
      </div>
    </PageContainer>
  );
}
