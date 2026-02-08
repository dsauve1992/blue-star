// Hybrid: V1 Horizontal Watchlist Cards + Left Sidebar Ticker List
import { useState, useEffect, useRef, useMemo } from "react";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
  useDeleteWatchlist,
} from "../hooks/use-watchlists";
import { PageContainer } from "src/global/design-system/page-container";
import { Button } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import TradingViewTapeCardWidget from "src/stock-analysis/components/new/TradingViewTapeCardWidget";
import { FinancialReportChartFooter } from "src/stock-analysis/components/FinancialReportChartFooter";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import {
  Bookmark,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Plus,
  Trash2,
  X,
  Search,
} from "lucide-react";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

function extractExchange(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[0] : "NASDAQ";
}

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

export default function Watchlist() {
  const { data, isLoading, error } = useWatchlists();
  const addTickerToWatchlist = useAddTickerToWatchlist();
  const removeTickerFromWatchlist = useRemoveTickerFromWatchlist();
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();

  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(
    null,
  );
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [addTickerInput, setAddTickerInput] = useState("");
  const [showFinancialFooter, setShowFinancialFooter] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const watchlistScrollRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedWatchlist = data?.watchlists.find(
    (w) => w.id === selectedWatchlistId,
  );
  const tickers = selectedWatchlist?.tickers || [];
  const currentIndex = tickers.findIndex((t) => t === selectedTicker);

  const symbolToFetch = selectedTicker ? extractSymbol(selectedTicker) : null;
  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
  } = useFinancialReport(symbolToFetch);

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
      exchange: extractExchange(selectedTicker),
      symbol: extractSymbol(selectedTicker),
      interval: "D" as const,
      range: "6m" as const,
    };
  }, [selectedTicker]);

  useEffect(() => {
    if (
      data?.watchlists &&
      data.watchlists.length > 0 &&
      !selectedWatchlistId
    ) {
      setSelectedWatchlistId(data.watchlists[0].id);
    }
  }, [data, selectedWatchlistId]);

  useEffect(() => {
    if (selectedWatchlist && tickers.length > 0) {
      if (!selectedTicker || !tickers.includes(selectedTicker)) {
        setSelectedTicker(tickers[0]);
      }
    } else {
      setSelectedTicker(null);
    }
  }, [selectedWatchlist, tickers, selectedTicker]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "SELECT" ||
          activeEl.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (!selectedWatchlist || tickers.length === 0) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        const currentIndex = tickers.findIndex((t) => t === selectedTicker);

        if (currentIndex === -1) {
          setSelectedTicker(tickers[0]);
          return;
        }

        let newIndex: number;
        if (event.key === "ArrowDown") {
          newIndex = Math.min(currentIndex + 1, tickers.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        const newTicker = tickers[newIndex];
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
  }, [selectedWatchlist, tickers, selectedTicker]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;

    try {
      const response = await createWatchlist.mutateAsync({
        name: newWatchlistName.trim(),
      });
      setSelectedWatchlistId(response.watchlistId);
      setNewWatchlistName("");
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create watchlist:", error);
    }
  };

  const handleDeleteWatchlist = async (watchlistId: string) => {
    if (window.confirm("Are you sure you want to delete this watchlist?")) {
      try {
        await deleteWatchlist.mutateAsync(watchlistId);
        if (selectedWatchlistId === watchlistId) {
          const remainingWatchlists =
            data?.watchlists.filter((w) => w.id !== watchlistId) || [];
          setSelectedWatchlistId(
            remainingWatchlists.length > 0 ? remainingWatchlists[0].id : null,
          );
        }
      } catch (error) {
        console.error("Failed to delete watchlist:", error);
      }
    }
  };

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker);
    const tickerElement = tickerRefs.current.get(ticker);
    if (tickerElement && listContainerRef.current) {
      tickerElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

  const handleRemoveTicker = async (ticker: string) => {
    if (!selectedWatchlistId) return;
    try {
      await removeTickerFromWatchlist.mutateAsync({
        watchlistId: selectedWatchlistId,
        ticker,
      });
      if (selectedTicker === ticker) {
        const remainingTickers = tickers.filter((t) => t !== ticker);
        setSelectedTicker(
          remainingTickers.length > 0 ? remainingTickers[0] : null,
        );
      }
    } catch (error) {
      console.error("Failed to remove ticker:", error);
    }
  };

  const handleAddTickerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTickerInput.trim() || !selectedWatchlistId) return;

    try {
      await addTickerToWatchlist.mutateAsync({
        watchlistId: selectedWatchlistId,
        request: { ticker: addTickerInput.trim().toUpperCase() },
      });
      setAddTickerInput("");
    } catch (error) {
      console.error("Failed to add ticker:", error);
    }
  };

  const navigateTicker = (direction: "up" | "down") => {
    if (tickers.length === 0) return;
    let newIndex: number;
    if (currentIndex === -1) {
      newIndex = 0;
    } else if (direction === "down") {
      newIndex = Math.min(currentIndex + 1, tickers.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    const newTicker = tickers[newIndex];
    handleTickerSelect(newTicker);
  };

  const scrollWatchlists = (direction: "left" | "right") => {
    if (!watchlistScrollRef.current) return;
    const scrollAmount = 200;
    const newOffset =
      direction === "left"
        ? Math.max(0, scrollOffset - scrollAmount)
        : scrollOffset + scrollAmount;
    setScrollOffset(newOffset);
    watchlistScrollRef.current.scrollTo({
      left: newOffset,
      behavior: "smooth",
    });
  };

  const renderTickerItem = (ticker: string) => {
    const isSelected = selectedTicker === ticker;
    const symbol = extractSymbol(ticker);
    const logoUrl = getTickerLogoUrl(symbol);
    const logoFailed = failedLogos.has(symbol);

    return (
      <div
        key={ticker}
        ref={(el) => {
          if (el) {
            tickerRefs.current.set(ticker, el);
          } else {
            tickerRefs.current.delete(ticker);
          }
        }}
        onClick={() => handleTickerSelect(ticker)}
        className={`
          group relative flex items-center gap-2 px-2 py-1.5 cursor-pointer
          transition-colors duration-150
          ${
            isSelected
              ? "bg-slate-700/50 border-l-2 border-l-blue-500"
              : "hover:bg-slate-700/30 border-l-2 border-l-transparent"
          }
        `}
      >
        <div
          className={`
          flex items-center justify-center w-6 h-6 rounded overflow-hidden flex-shrink-0
          ${isSelected ? "bg-slate-600" : "bg-slate-700"}
        `}
        >
          {logoFailed ? (
            <span className="font-semibold text-[9px] text-slate-300">
              {symbol.slice(0, 3)}
            </span>
          ) : (
            <img
              src={logoUrl}
              alt={symbol}
              className="w-full h-full object-contain p-0.5"
              onError={() => {
                setFailedLogos((prev) => new Set(prev).add(symbol));
              }}
            />
          )}
        </div>

        <span
          className={`text-xs font-medium truncate flex-1 ${isSelected ? "text-white" : "text-slate-300"}`}
        >
          {ticker}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveTicker(ticker);
          }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-600/50 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
          aria-label={`Remove ${ticker}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col h-screen">
          {/* Top Bar - Horizontal Watchlist Cards */}
          <div className="flex-shrink-0 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-xl">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <button
                onClick={() => scrollWatchlists("left")}
                className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div
                ref={watchlistScrollRef}
                className="flex-1 overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: "none" }}
              >
                <div className="flex gap-1.5">
                  {isLoading && <LoadingSpinner />}

                  {!isLoading &&
                    data?.watchlists.map((watchlist) => (
                      <div
                        key={watchlist.id}
                        onClick={() => setSelectedWatchlistId(watchlist.id)}
                        className={`
                          group relative flex-shrink-0 w-36 px-2.5 py-1.5 rounded cursor-pointer
                          border transition-all duration-200
                          ${
                            selectedWatchlistId === watchlist.id
                              ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg"
                              : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Bookmark className="w-3 h-3 text-blue-400 flex-shrink-0" />
                              <h3 className="text-xs font-semibold text-white truncate">
                                {watchlist.name}
                              </h3>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {watchlist.tickers.length} ticker
                              {watchlist.tickers.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWatchlist(watchlist.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                  {/* New Watchlist Card */}
                  {!showCreateForm ? (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="flex-shrink-0 w-36 px-2.5 py-1.5 rounded border border-dashed border-slate-600 hover:border-blue-500/50 bg-slate-800/30 hover:bg-slate-700/30 transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="text-xs font-medium">New</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleCreateWatchlist}
                      className="flex-shrink-0 w-36 px-2.5 py-1.5 rounded border border-blue-500/50 bg-slate-800/50 flex flex-col gap-1.5"
                    >
                      <input
                        type="text"
                        value={newWatchlistName}
                        onChange={(e) => setNewWatchlistName(e.target.value)}
                        placeholder="Name..."
                        maxLength={255}
                        className="w-full px-2 py-1 rounded text-[10px] bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            !newWatchlistName.trim() ||
                            createWatchlist.isPending
                          }
                          className="flex-1 text-[10px] py-0.5 h-auto"
                        >
                          Create
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowCreateForm(false);
                            setNewWatchlistName("");
                          }}
                          className="text-[10px] py-0.5 px-1.5 h-auto"
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              <button
                onClick={() => scrollWatchlists("right")}
                className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Content Area - Sidebar + Chart */}
          <div className="flex-1 flex min-h-0">
            {/* Left Sidebar - Ticker List */}
            {selectedWatchlist && (
              <aside className="w-56 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
                {/* Add Ticker Input */}
                <div className="px-3 py-2 border-b border-slate-700/50">
                  <form
                    onSubmit={handleAddTickerInline}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                      <input
                        type="text"
                        value={addTickerInput}
                        onChange={(e) => setAddTickerInput(e.target.value)}
                        placeholder="Add ticker..."
                        maxLength={50}
                        disabled={addTickerToWatchlist.isPending}
                        className="w-full pl-7 pr-2 py-1.5 rounded-md text-xs bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        !addTickerInput.trim() ||
                        addTickerToWatchlist.isPending
                      }
                      className="p-1.5 rounded-md bg-blue-600/50 text-white hover:bg-blue-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Ticker List */}
                <div
                  ref={listContainerRef}
                  className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                  tabIndex={0}
                >
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <LoadingSpinner />
                      <span className="text-sm text-slate-400">
                        Loading watchlists...
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="p-3">
                      <Alert variant="danger">
                        <AlertDescription>
                          Failed to load watchlists. Please try again.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {!isLoading && !error && tickers.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="p-3 rounded-full bg-slate-700/50 mb-3">
                        <Bookmark className="w-6 h-6 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-xs">
                        No tickers yet. Use the input above to add one.
                      </p>
                    </div>
                  )}

                  {!isLoading && !error && tickers.map(renderTickerItem)}
                </div>

                {/* Compact Navigation Footer */}
                {tickers.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-900/30">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => navigateTicker("up")}
                        disabled={currentIndex <= 0}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {currentIndex + 1}/{tickers.length}
                      </span>
                      <button
                        onClick={() => navigateTicker("down")}
                        disabled={currentIndex >= tickers.length - 1}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            )}

            {/* Chart Area */}
            <main className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex flex-col min-h-0 p-4 gap-2 overflow-hidden">
                <div className="flex-1 min-h-0">
                  {selectedTicker && tradingViewProps ? (
                    <div className="h-full rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl shadow-2xl">
                      <TradingViewTapeCardWidget
                        exchange={tradingViewProps.exchange}
                        symbol={tradingViewProps.symbol}
                        interval={tradingViewProps.interval}
                        range={tradingViewProps.range}
                        movingAverages={movingAverages}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center rounded-xl border border-slate-700/50 border-dashed bg-slate-800/20">
                      <div className="p-6 rounded-full bg-slate-700/30 mb-6">
                        <BarChart3 className="w-16 h-16 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-300 mb-2">
                        No Ticker Selected
                      </h3>
                      <p className="text-slate-500 text-center max-w-md">
                        {selectedWatchlist
                          ? "Select a ticker from the list on the left."
                          : "Select a watchlist from the cards above."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible Financial Footer */}
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
      </div>
    </PageContainer>
  );
}
