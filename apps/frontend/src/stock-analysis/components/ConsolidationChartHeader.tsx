import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  TrendingUp,
  Sparkles,
  BookmarkPlus,
  Check,
} from "lucide-react";
import { Badge } from "src/global/design-system";
import type { ConsolidationResult } from "../api/consolidation.client";
import type { Watchlist } from "src/watchlist/api/watchlist.client";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

interface ConsolidationChartHeaderProps {
  selectedTicker: string | null;
  selectedConsolidation: ConsolidationResult | undefined;
  watchlists: Watchlist[];
  isLoading: boolean;
  onRefetch: () => void;
  onToggleWatchlist: (watchlistId: string, isInWatchlist: boolean) => void;
  onCreateWatchlist: (name: string) => Promise<void>;
  isAddingToWatchlist: boolean;
  isRemovingFromWatchlist: boolean;
  isCreatingWatchlist: boolean;
}

export function ConsolidationChartHeader({
  selectedTicker,
  selectedConsolidation,
  watchlists,
  isLoading,
  onRefetch,
  onToggleWatchlist,
  onCreateWatchlist,
  isAddingToWatchlist,
  isRemovingFromWatchlist,
  isCreatingWatchlist,
}: ConsolidationChartHeaderProps) {
  const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside to close dropdown
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showWatchlistDropdown]);

  // Reset logo failure when ticker changes
  useEffect(() => {
    setLogoFailed(false);
  }, [selectedTicker]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    await onCreateWatchlist(newWatchlistName.trim());
    setNewWatchlistName("");
  };

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
      <div className="flex items-center gap-4 flex-wrap">
        {selectedTicker ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-slate-700/50 overflow-hidden border border-slate-600/50 shadow-lg flex items-center justify-center">
                {logoFailed ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <img
                    src={getTickerLogoUrl(extractSymbol(selectedTicker))}
                    alt={extractSymbol(selectedTicker)}
                    className="w-full h-full object-contain p-1"
                    onError={() => setLogoFailed(true)}
                  />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {extractSymbol(selectedTicker)}
                </h2>
              </div>
            </div>
            {selectedConsolidation?.isNew && (
              <Badge variant="success" className="ml-2">
                <Sparkles className="w-3 h-3 mr-1" />
                New Signal
              </Badge>
            )}
            {selectedConsolidation?.themes &&
              selectedConsolidation.themes.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-2">
                  {selectedConsolidation.themes.map((theme) => (
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
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWatchlistDropdown(!showWatchlistDropdown);
              }}
              className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium
                        bg-blue-600/50 text-white hover:bg-blue-600/70
                        border border-blue-500/50 transition-all duration-200"
            >
              <BookmarkPlus className="w-3 h-3" />
              Add to Watchlist
            </button>

            {showWatchlistDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-[9999] overflow-hidden">
                {watchlists.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Select Watchlist
                    </div>
                    {watchlists.map((watchlist) => {
                      const tickerSymbol = extractSymbol(selectedTicker);
                      const isTickerInWatchlist =
                        watchlist.tickers.includes(selectedTicker) ||
                        watchlist.tickers.includes(tickerSymbol);
                      return (
                        <button
                          key={watchlist.id}
                          onClick={() =>
                            onToggleWatchlist(
                              watchlist.id,
                              isTickerInWatchlist,
                            )
                          }
                          disabled={
                            isAddingToWatchlist || isRemovingFromWatchlist
                          }
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-slate-700/50 transition-colors
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="truncate">{watchlist.name}</span>
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
                      onChange={(e) => setNewWatchlistName(e.target.value)}
                      placeholder="Watchlist name..."
                      maxLength={255}
                      disabled={isCreatingWatchlist}
                      className="w-full px-3 py-2 rounded-md text-sm bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500
                              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                              disabled:opacity-50 disabled:cursor-not-allowed"
                      autoFocus={watchlists.length === 0}
                    />
                    <button
                      type="submit"
                      disabled={
                        !newWatchlistName.trim() || isCreatingWatchlist
                      }
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                              bg-blue-600/50 text-white hover:bg-blue-600/70
                              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      {isCreatingWatchlist ? "Creating..." : "Create & Add"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onRefetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium
                  bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                  border border-slate-600/50 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
    </header>
  );
}
