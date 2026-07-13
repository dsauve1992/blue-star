import { useState, useRef, useEffect } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import type { Watchlist } from "../api/watchlist.client";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

interface AddToWatchlistButtonProps {
  ticker: string;
  watchlists: Watchlist[];
  onToggleWatchlist: (watchlistId: string, isInWatchlist: boolean) => void;
  onCreateWatchlist: (name: string) => Promise<void>;
  isAddingToWatchlist: boolean;
  isRemovingFromWatchlist: boolean;
  isCreatingWatchlist: boolean;
}

export function AddToWatchlistButton({
  ticker,
  watchlists,
  onToggleWatchlist,
  onCreateWatchlist,
  isAddingToWatchlist,
  isRemovingFromWatchlist,
  isCreatingWatchlist,
}: AddToWatchlistButtonProps) {
  const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    await onCreateWatchlist(newWatchlistName.trim());
    setNewWatchlistName("");
  };

  return (
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
                const tickerSymbol = extractSymbol(ticker);
                const isTickerInWatchlist =
                  watchlist.tickers.includes(ticker) ||
                  watchlist.tickers.includes(tickerSymbol);
                return (
                  <button
                    key={watchlist.id}
                    onClick={() =>
                      onToggleWatchlist(watchlist.id, isTickerInWatchlist)
                    }
                    disabled={isAddingToWatchlist || isRemovingFromWatchlist}
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
            <form onSubmit={handleCreateWatchlist} className="space-y-2">
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
                disabled={!newWatchlistName.trim() || isCreatingWatchlist}
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
  );
}
