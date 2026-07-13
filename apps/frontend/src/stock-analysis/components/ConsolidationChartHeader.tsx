import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "src/global/design-system";
import type { ConsolidationResult } from "../api/consolidation.client";
import type { Watchlist } from "src/watchlist/api/watchlist.client";
import { AddToWatchlistButton } from "src/watchlist/components/AddToWatchlistButton";

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
  const [logoFailed, setLogoFailed] = useState(false);

  // Reset logo failure when ticker changes
  useEffect(() => {
    setLogoFailed(false);
  }, [selectedTicker]);

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
          <AddToWatchlistButton
            ticker={selectedTicker}
            watchlists={watchlists}
            onToggleWatchlist={onToggleWatchlist}
            onCreateWatchlist={onCreateWatchlist}
            isAddingToWatchlist={isAddingToWatchlist}
            isRemovingFromWatchlist={isRemovingFromWatchlist}
            isCreatingWatchlist={isCreatingWatchlist}
          />
        )}

        <button
          onClick={() => onRefetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium
                  bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                  border border-slate-600/50 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </header>
  );
}
