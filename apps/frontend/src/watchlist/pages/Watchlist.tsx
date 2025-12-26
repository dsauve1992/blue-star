import { useState, useEffect, useRef, useMemo } from "react";
import {
  useWatchlists,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
  useDeleteWatchlist,
} from "../hooks/use-watchlists";
import { PageContainer } from "src/global/design-system/page-container";
import { Button } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import { Input } from "src/global/design-system";
import TradingViewTapeCardWidget from "src/stock-analysis/components/new/TradingViewTapeCardWidget";
import { AddTickerModal } from "../components/AddTickerModal";
import {
  Bookmark,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Plus,
  Trash2,
  X,
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
  const [showAddTickerModal, setShowAddTickerModal] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedWatchlist = data?.watchlists.find(
    (w) => w.id === selectedWatchlistId,
  );
  const tickers = selectedWatchlist?.tickers || [];

  const currentIndex = tickers.findIndex((t) => t === selectedTicker);

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
          group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer
          transition-all duration-200 ease-out
          ${
            isSelected
              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 shadow-lg shadow-blue-500/10"
              : "hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50"
          }
        `}
      >
        <div
          className={`
          flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden
          transition-all duration-200
          ${
            isSelected
              ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg ring-2 ring-blue-400/50"
              : "bg-slate-700 group-hover:bg-slate-600"
          }
        `}
        >
          {logoFailed ? (
            <span
              className={`font-bold text-sm ${isSelected ? "text-white" : "text-slate-300"}`}
            >
              {symbol.slice(0, 4)}
            </span>
          ) : (
            <img
              src={logoUrl}
              alt={symbol}
              className="w-full h-full object-contain p-1"
              onError={() => {
                setFailedLogos((prev) => new Set(prev).add(symbol));
              }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold truncate ${isSelected ? "text-white" : "text-slate-100"}`}
            >
              {ticker}
            </span>
          </div>
        </div>

        {isSelected && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-l-full" />
        )}
      </div>
    );
  };

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI5M2MiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0tNiA2aC0ydi00aDJ2NHptMC02aC0ydi00aDJ2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30 pointer-events-none" />

        <div className="relative flex h-screen">
          <aside className="w-80 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
            <div className="p-5 border-b border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
                  <Bookmark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Watchlists</h1>
                  <p className="text-xs text-slate-400">
                    Manage your ticker lists
                  </p>
                </div>
              </div>

              {showCreateForm ? (
                <form onSubmit={handleCreateWatchlist} className="space-y-2">
                  <Input
                    type="text"
                    value={newWatchlistName}
                    onChange={(e) => setNewWatchlistName(e.target.value)}
                    placeholder="Watchlist name..."
                    maxLength={255}
                    disabled={createWatchlist.isPending}
                    className="bg-slate-900/50 border-slate-600/50 text-slate-200 placeholder-slate-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        !newWatchlistName.trim() || createWatchlist.isPending
                      }
                      className="flex-1"
                    >
                      {createWatchlist.isPending ? "Creating..." : "Create"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewWatchlistName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowCreateForm(true)}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Watchlist
                  </Button>
                </div>
              )}

              {data?.watchlists && data.watchlists.length > 0 && (
                <div className="mt-4 space-y-1">
                  {data.watchlists.map((watchlist) => (
                    <div
                      key={watchlist.id}
                      className={`
                        flex items-center justify-between p-2 rounded-lg cursor-pointer
                        transition-all duration-200
                        ${
                          selectedWatchlistId === watchlist.id
                            ? "bg-blue-500/20 border border-blue-500/50"
                            : "hover:bg-slate-700/50 border border-transparent"
                        }
                      `}
                      onClick={() => setSelectedWatchlistId(watchlist.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white truncate">
                          {watchlist.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {watchlist.tickers.length} ticker
                          {watchlist.tickers.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWatchlist(watchlist.id);
                        }}
                        className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"
                        aria-label={`Delete ${watchlist.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedWatchlist && (
              <>
                <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">
                      {selectedWatchlist.name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddTickerModal(true)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Ticker
                    </Button>
                  </div>
                  <div className="text-xs text-slate-400">
                    {tickers.length} ticker{tickers.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div
                  ref={listContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                  tabIndex={0}
                >
                  {tickers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                        <Bookmark className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        No tickers in this watchlist yet.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddTickerModal(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Your First Ticker
                      </Button>
                    </div>
                  ) : (
                    tickers.map(renderTickerItem)
                  )}
                </div>

                {tickers.length > 0 && (
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
                        {currentIndex + 1} / {tickers.length}
                      </span>
                      <button
                        onClick={() => navigateTicker("down")}
                        disabled={currentIndex >= tickers.length - 1}
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
              </>
            )}

            {!selectedWatchlist && !isLoading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                  <Bookmark className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">
                  {data?.watchlists && data.watchlists.length === 0
                    ? "Create your first watchlist to get started"
                    : "Select a watchlist to view tickers"}
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <LoadingSpinner />
                <span className="text-sm text-slate-400">
                  Loading watchlists...
                </span>
              </div>
            )}

            {error && (
              <div className="p-4">
                <Alert variant="danger">
                  <AlertDescription>
                    Failed to load watchlists. Please try again.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </aside>

          <main className="flex-1 flex flex-col min-w-0">
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
                {selectedTicker && selectedWatchlist && (
                  <button
                    onClick={() => handleRemoveTicker(selectedTicker)}
                    disabled={removeTickerFromWatchlist.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  bg-red-600/50 text-white hover:bg-red-600/70
                  border border-red-500/50 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    Remove from Watchlist
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 p-6 overflow-hidden">
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
                    {selectedWatchlist
                      ? "Select a ticker from the list on the left to view its interactive chart with technical indicators."
                      : "Select or create a watchlist to get started."}
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <AddTickerModal
        watchlist={selectedWatchlist || null}
        isOpen={showAddTickerModal}
        onClose={() => setShowAddTickerModal(false)}
      />
    </PageContainer>
  );
}
