import { useState, useRef, useEffect } from "react";
import { BookmarkCheck, BookmarkPlus, Check } from "lucide-react";
import type { Watchlist } from "../api/watchlist.client";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

const MENU_WIDTH_PX = 256;

interface AddToWatchlistButtonProps {
  ticker: string;
  watchlists: Watchlist[];
  onToggleWatchlist: (
    watchlistId: string,
    isInWatchlist: boolean,
  ) => Promise<void>;
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
  const [alignMenuLeft, setAlignMenuLeft] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tickerSymbol = extractSymbol(ticker);
  const containsTicker = (watchlist: Watchlist) =>
    watchlist.tickers.includes(ticker) ||
    watchlist.tickers.includes(tickerSymbol);
  const savedIn = watchlists.filter(containsTicker);
  const isSaved = savedIn.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowWatchlistDropdown(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowWatchlistDropdown(false);
      triggerRef.current?.focus();
    };
    if (showWatchlistDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [showWatchlistDropdown]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      await onCreateWatchlist(newWatchlistName.trim());
      setNewWatchlistName("");
      setErrorMessage(null);
    } catch {
      setErrorMessage("Couldn't create the watchlist. Try again.");
    }
  };

  const handleToggleWatchlist = async (
    watchlist: Watchlist,
    isTickerInWatchlist: boolean,
  ) => {
    try {
      await onToggleWatchlist(watchlist.id, isTickerInWatchlist);
      setErrorMessage(null);
    } catch {
      setErrorMessage(
        `Couldn't ${isTickerInWatchlist ? "remove" : "add"} ${tickerSymbol} ${
          isTickerInWatchlist ? "from" : "to"
        } ${watchlist.name}. Try again.`,
      );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        aria-haspopup="true"
        aria-expanded={showWatchlistDropdown}
        onClick={(e) => {
          e.stopPropagation();
          setAlignMenuLeft(
            e.currentTarget.getBoundingClientRect().right < MENU_WIDTH_PX,
          );
          setShowWatchlistDropdown(!showWatchlistDropdown);
          setErrorMessage(null);
        }}
        title={
          isSaved
            ? `In ${savedIn.map((watchlist) => watchlist.name).join(", ")}`
            : undefined
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                  border transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400
                  ${
                    isSaved
                      ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/40"
                      : "bg-blue-600/50 text-white hover:bg-blue-600/70 border-blue-500/50"
                  }`}
      >
        {isSaved ? (
          <BookmarkCheck className="w-3 h-3 flex-shrink-0" />
        ) : (
          <BookmarkPlus className="w-3 h-3 flex-shrink-0" />
        )}
        <span className="max-w-[12rem] truncate">
          {isSaved
            ? savedIn.length === 1
              ? `In ${savedIn[0].name}`
              : `In ${savedIn.length} watchlists`
            : "Add to Watchlist"}
        </span>
      </button>

      {showWatchlistDropdown && (
        <div
          className={`absolute mt-2 w-64 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-[9999] overflow-hidden ${alignMenuLeft ? "left-0" : "right-0"}`}
        >
          {watchlists.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Watchlist
              </div>
              {watchlists.map((watchlist) => {
                const isTickerInWatchlist = containsTicker(watchlist);
                return (
                  <button
                    key={watchlist.id}
                    onClick={() =>
                      handleToggleWatchlist(watchlist, isTickerInWatchlist)
                    }
                    aria-pressed={isTickerInWatchlist}
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

          {errorMessage && (
            <p
              role="alert"
              className="border-t border-slate-700/50 px-5 py-2 text-xs text-red-400"
            >
              {errorMessage}
            </p>
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
