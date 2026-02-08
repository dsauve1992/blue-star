import { useState, useCallback } from "react";
import {
  Bookmark,
  ChevronUp,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import { TickerListItem } from "./TickerListItem";

interface TickerSidebarProps {
  tickers: string[];
  selectedTicker: string | null;
  isLoading: boolean;
  error: Error | null;
  isAddingTicker: boolean;
  onTickerSelect: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  onAddTicker: (ticker: string) => Promise<void>;
  tickerRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function TickerSidebar({
  tickers,
  selectedTicker,
  isLoading,
  error,
  isAddingTicker,
  onTickerSelect,
  onRemoveTicker,
  onAddTicker,
  tickerRefs,
  listContainerRef,
}: TickerSidebarProps) {
  const [addTickerInput, setAddTickerInput] = useState("");

  const currentIndex = tickers.findIndex((t) => t === selectedTicker);

  const handleTickerSelect = useCallback(
    (ticker: string) => {
      onTickerSelect(ticker);
      const tickerElement = tickerRefs.current.get(ticker);
      if (tickerElement && listContainerRef.current) {
        tickerElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    },
    [onTickerSelect, tickerRefs, listContainerRef],
  );

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
    handleTickerSelect(tickers[newIndex]);
  };

  const handleAddTickerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTickerInput.trim()) return;
    await onAddTicker(addTickerInput.trim().toUpperCase());
    setAddTickerInput("");
  };

  const setTickerRef = useCallback(
    (ticker: string, el: HTMLDivElement | null) => {
      if (el) {
        tickerRefs.current.set(ticker, el);
      } else {
        tickerRefs.current.delete(ticker);
      }
    },
    [tickerRefs],
  );

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
      {/* Add Ticker Input */}
      <div className="px-3 py-2 border-b border-slate-700/50">
        <form
          onSubmit={handleAddTickerSubmit}
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
              disabled={isAddingTicker}
              className="w-full pl-7 pr-2 py-1.5 rounded-md text-xs bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!addTickerInput.trim() || isAddingTicker}
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

        {!isLoading &&
          !error &&
          tickers.map((ticker) => (
            <div
              key={ticker}
              ref={(el) => setTickerRef(ticker, el)}
            >
              <TickerListItem
                ticker={ticker}
                isSelected={selectedTicker === ticker}
                onSelect={handleTickerSelect}
                onRemove={onRemoveTicker}
              />
            </div>
          ))}
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
  );
}
