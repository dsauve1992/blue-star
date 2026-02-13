import { useRef, useMemo, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronDown, BarChart3 } from "lucide-react";
import { PageContainer } from "src/global/design-system/page-container";
import { useConsolidations } from "../hooks/use-consolidations";
import { useRunConsolidationAnalysis } from "../hooks/use-run-consolidation-analysis";
import {
  useConsolidationSelection,
  type AnalysisType,
} from "../hooks/use-consolidation-selection";
import { useConsolidationKeyboardNavigation } from "../hooks/use-consolidation-keyboard-navigation";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import { useLatestSectorStatus } from "src/sector-rotation/hooks/use-latest-sector-status";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
} from "src/watchlist/hooks/use-watchlists";
import type { AnalyzeConsolidationsRequest } from "../api/consolidation.client";
import { ConsolidationSidebar } from "../components/ConsolidationSidebar";
import { ConsolidationChartHeader } from "../components/ConsolidationChartHeader";
import TradingViewTapeCardWidget from "../components/new/TradingViewTapeCardWidget";
import { FinancialReportChartFooter } from "../components/FinancialReportChartFooter";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

export default function ConsolidationAnalysis() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const analysisType: AnalysisType = type === "weekly" ? "weekly" : "daily";

  // Data fetching
  const request: AnalyzeConsolidationsRequest = { type: analysisType };
  const { data, isLoading, error, refetch } = useConsolidations(request);
  const runAnalysis = useRunConsolidationAnalysis();
  const { data: watchlistsData } = useWatchlists();
  const addTickerToWatchlist = useAddTickerToWatchlist();
  const removeTickerFromWatchlist = useRemoveTickerFromWatchlist();
  const createWatchlist = useCreateWatchlist();
  const { data: sectorStatusData } = useLatestSectorStatus();
  const sectorStatuses = sectorStatusData?.sectors ?? [];

  // Selection & filtering
  const {
    selectedTicker,
    setSelectedTicker,
    sectorFilterMode,
    setSectorFilterMode,
    consolidations,
    currentIndex,
  } = useConsolidationSelection({ data, analysisType, sectorStatuses });

  // Refs for keyboard navigation
  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useConsolidationKeyboardNavigation({
    tickers: consolidations.map((c) => c.tickerFullName),
    selectedTicker,
    onTickerChange: setSelectedTicker,
    tickerRefs,
    listContainerRef,
  });

  // Financial data
  const symbolToFetch = selectedTicker ? extractSymbol(selectedTicker) : null;
  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
  } = useFinancialReport(symbolToFetch);
  const [showFinancialFooter, setShowFinancialFooter] = useState(true);

  // Derived data
  const selectedConsolidation = consolidations.find(
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

  // Handlers
  const handleTickerSelect = useCallback(
    (tickerFullName: string) => {
      setSelectedTicker(tickerFullName);
      const tickerElement = tickerRefs.current.get(tickerFullName);
      if (tickerElement && listContainerRef.current) {
        tickerElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [setSelectedTicker],
  );

  const handleNavigate = useCallback(
    (direction: "up" | "down") => {
      if (consolidations.length === 0) return;
      let newIndex: number;
      if (currentIndex === -1) {
        newIndex = 0;
      } else if (direction === "down") {
        newIndex = Math.min(currentIndex + 1, consolidations.length - 1);
      } else {
        newIndex = Math.max(currentIndex - 1, 0);
      }
      handleTickerSelect(consolidations[newIndex].tickerFullName);
    },
    [consolidations, currentIndex, handleTickerSelect],
  );

  const handleTypeChange = useCallback(
    (newType: AnalysisType) => {
      navigate(`/stock-analysis/${newType}`);
    },
    [navigate],
  );

  const handleRunAnalysis = useCallback(async () => {
    try {
      await runAnalysis.mutateAsync({ type: analysisType });
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      console.error("Failed to run analysis:", err);
    }
  }, [runAnalysis, analysisType, refetch]);

  const handleToggleWatchlist = useCallback(
    async (watchlistId: string, isTickerInWatchlist: boolean) => {
      if (!selectedTicker) return;
      const tickerSymbol = extractSymbol(selectedTicker);
      const tickerToUse =
        watchlistsData?.watchlists
          .find((w) => w.id === watchlistId)
          ?.tickers.find(
            (t) => t === selectedTicker || t === tickerSymbol,
          ) || selectedTicker;
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
      } catch (err) {
        console.error(
          `Failed to ${isTickerInWatchlist ? "remove" : "add"} ticker:`,
          err,
        );
      }
    },
    [
      selectedTicker,
      watchlistsData,
      addTickerToWatchlist,
      removeTickerFromWatchlist,
    ],
  );

  const handleCreateWatchlist = useCallback(
    async (name: string) => {
      if (!selectedTicker) return;
      try {
        const response = await createWatchlist.mutateAsync({ name });
        await addTickerToWatchlist.mutateAsync({
          watchlistId: response.watchlistId,
          request: { ticker: selectedTicker },
        });
      } catch (err) {
        console.error("Failed to create watchlist:", err);
      }
    },
    [selectedTicker, createWatchlist, addTickerToWatchlist],
  );

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI5M2MiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0tNiA2aC0ydi00aDJ2NHptMC02aC0ydi00aDJ2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30 pointer-events-none" />

        <div className="relative flex h-screen">
          <ConsolidationSidebar
            consolidations={consolidations}
            selectedTicker={selectedTicker}
            analysisType={analysisType}
            sectorFilterMode={sectorFilterMode}
            sectorStatuses={sectorStatuses}
            currentIndex={currentIndex}
            isLoading={isLoading}
            error={error}
            data={data}
            isRunningAnalysis={runAnalysis.isPending}
            onTickerSelect={handleTickerSelect}
            onNavigate={handleNavigate}
            onTypeChange={handleTypeChange}
            onSectorFilterChange={setSectorFilterMode}
            onRunAnalysis={handleRunAnalysis}
            tickerRefs={tickerRefs}
            listContainerRef={listContainerRef}
          />

          <main className="flex-1 flex flex-col min-w-0">
            <ConsolidationChartHeader
              selectedTicker={selectedTicker}
              selectedConsolidation={selectedConsolidation}
              watchlists={watchlistsData?.watchlists ?? []}
              isLoading={isLoading}
              onRefetch={() => refetch()}
              onToggleWatchlist={handleToggleWatchlist}
              onCreateWatchlist={handleCreateWatchlist}
              isAddingToWatchlist={addTickerToWatchlist.isPending}
              isRemovingFromWatchlist={removeTickerFromWatchlist.isPending}
              isCreatingWatchlist={createWatchlist.isPending}
            />

            {/* Chart Content */}
            <div className="flex-1 flex flex-col min-h-0 p-6 gap-2 overflow-hidden">
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
                <div className="flex-shrink-0">
                  <button
                    onClick={() =>
                      setShowFinancialFooter(!showFinancialFooter)
                    }
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 group"
                    aria-expanded={showFinancialFooter}
                    aria-label={
                      showFinancialFooter
                        ? "Hide financial data"
                        : "Show financial data"
                    }
                  >
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                      {showFinancialFooter ? "Hide" : "Show"} Financials
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                        showFinancialFooter ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      showFinancialFooter
                        ? "max-h-[500px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <FinancialReportChartFooter
                      report={financialData?.report ?? null}
                      isLoading={financialLoading}
                      error={financialError}
                    />
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </PageContainer>
  );
}
