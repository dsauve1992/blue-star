import { useState, useRef } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Radio,
} from "lucide-react";
import { Button } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import type { Watchlist } from "../api/watchlist.client";
import {
  useMonitoringStatus,
  useActivateMonitoring,
  useDeactivateMonitoring,
} from "src/watchlist-monitoring/hooks/use-watchlist-monitoring";

interface WatchlistCardBarProps {
  watchlists: Watchlist[];
  selectedWatchlistId: string | null;
  isLoading: boolean;
  onSelectWatchlist: (id: string) => void;
  onDeleteWatchlist: (id: string) => void;
  onCreateWatchlist: (name: string) => Promise<void>;
}

export function WatchlistCardBar({
  watchlists,
  selectedWatchlistId,
  isLoading,
  onSelectWatchlist,
  onDeleteWatchlist,
  onCreateWatchlist,
}: WatchlistCardBarProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const watchlistScrollRef = useRef<HTMLDivElement>(null);

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

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateWatchlist(newWatchlistName.trim());
      setNewWatchlistName("");
      setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
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
              watchlists.map((watchlist) => (
                <WatchlistCard
                  key={watchlist.id}
                  watchlist={watchlist}
                  isSelected={selectedWatchlistId === watchlist.id}
                  onSelect={() => onSelectWatchlist(watchlist.id)}
                  onDelete={() => onDeleteWatchlist(watchlist.id)}
                />
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
                    disabled={!newWatchlistName.trim() || isCreating}
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
  );
}

interface WatchlistCardProps {
  watchlist: Watchlist;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function WatchlistCard({
  watchlist,
  isSelected,
  onSelect,
  onDelete,
}: WatchlistCardProps) {
  const { data: monitoringData } = useMonitoringStatus(watchlist.id);
  const activateMonitoring = useActivateMonitoring();
  const deactivateMonitoring = useDeactivateMonitoring();

  const breakoutMonitoring = monitoringData?.monitorings.find(
    (m) => m.type === "BREAKOUT",
  );
  const isMonitoringActive = breakoutMonitoring?.active ?? false;

  const handleToggleMonitoring = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMonitoringActive) {
      deactivateMonitoring.mutate({
        watchlistId: watchlist.id,
        type: "BREAKOUT",
      });
    } else {
      activateMonitoring.mutate({
        watchlistId: watchlist.id,
        type: "BREAKOUT",
      });
    }
  };

  const isToggling =
    activateMonitoring.isPending || deactivateMonitoring.isPending;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative flex-shrink-0 w-36 px-2.5 py-1.5 rounded cursor-pointer
        border transition-all duration-200
        ${
          isSelected
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
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-slate-400">
              {watchlist.tickers.length} ticker
              {watchlist.tickers.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={handleToggleMonitoring}
              disabled={isToggling}
              title={
                isMonitoringActive
                  ? "Disable breakout monitoring"
                  : "Enable breakout monitoring"
              }
              className={`
                p-0.5 rounded transition-all flex-shrink-0
                ${
                  isMonitoringActive
                    ? "text-green-400 hover:text-green-300"
                    : "text-slate-600 hover:text-slate-400"
                }
                ${isToggling ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <Radio
                className={`w-2.5 h-2.5 ${isMonitoringActive ? "animate-pulse" : ""}`}
              />
            </button>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
