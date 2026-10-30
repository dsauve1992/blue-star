import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
  useDeleteWatchlist,
  useRenameWatchlist,
  useMoveTicker,
  useCopyTicker,
} from "../hooks/use-watchlists";
import { useWatchlistSelection } from "../hooks/use-watchlist-selection";
import { useTickerKeyboardNavigation } from "../hooks/use-ticker-keyboard-navigation";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import type { ChartInterval } from "src/market-data/api/chart-data.client";
import { PageContainer } from "src/global/design-system/page-container";
import { Alert, AlertDescription } from "src/global/design-system";
import { X } from "lucide-react";
import { WatchlistCardBar } from "../components/WatchlistCardBar";
import { TickerSidebar } from "../components/TickerSidebar";
import { ChartPanel } from "../components/ChartPanel";

const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";
const UNDO_NOTICE_MS = 8000;

interface RemovedTicker {
  ticker: string;
  watchlistId: string;
  watchlistName: string;
}

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

function extractExchange(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[0] : "NASDAQ";
}

export default function Watchlist() {
  const { data, isLoading, error } = useWatchlists();
  const addTickerToWatchlist = useAddTickerToWatchlist();
  const removeTickerFromWatchlist = useRemoveTickerFromWatchlist();
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const renameWatchlist = useRenameWatchlist();
  const moveTicker = useMoveTicker();
  const copyTicker = useCopyTicker();

  const {
    selectedWatchlistId,
    setSelectedWatchlistId,
    selectedTicker,
    setSelectedTicker,
    selectedWatchlist,
    tickers,
  } = useWatchlistSelection({ data });

  const [actionError, setActionError] = useState<string | null>(null);
  const [removedTicker, setRemovedTicker] = useState<RemovedTicker | null>(
    null,
  );
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismissRemovedTicker = useCallback(() => {
    clearTimeout(undoTimerRef.current);
    setRemovedTicker(null);
  }, []);

  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  const removedTickerRef = useRef(removedTicker);
  useEffect(() => {
    removedTickerRef.current = removedTicker;
  }, [removedTicker]);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useTickerKeyboardNavigation({
    tickers,
    selectedTicker,
    onTickerChange: setSelectedTicker,
    tickerRefs,
    listContainerRef,
  });

  const [interval, setInterval] = useState<ChartInterval>("D");
  const [includeExtendedHours, setIncludeExtendedHours] = useState(true);

  const symbolToFetch = selectedTicker ? extractSymbol(selectedTicker) : null;
  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
    refetch: refetchFinancials,
  } = useFinancialReport(symbolToFetch);

  const movingAverages = useMemo(
    () => getDefaultMovingAverages(interval),
    [interval],
  );

  const bars = interval === "W" ? 156 : 520;

  const chartProps = useMemo(() => {
    if (!selectedTicker) return null;
    return {
      exchange: extractExchange(selectedTicker),
      symbol: extractSymbol(selectedTicker),
      interval,
      bars,
    };
  }, [selectedTicker, interval, bars]);

  const {
    candles: spyCandles,
    loadMore: loadMoreSpy,
    isLoadingMore: isLoadingMoreSpy,
  } = useChartData(
    BENCHMARK_SYMBOL,
    BENCHMARK_EXCHANGE,
    interval,
    bars,
    includeExtendedHours,
  );

  const handleCreateWatchlist = useCallback(
    async (name: string) => {
      try {
        const response = await createWatchlist.mutateAsync({ name });
        setSelectedWatchlistId(response.watchlistId);
      } catch (err) {
        console.error("Failed to create watchlist:", err);
        throw err;
      }
    },
    [createWatchlist, setSelectedWatchlistId],
  );

  const handleDeleteWatchlist = useCallback(
    async (watchlistId: string) => {
      if (window.confirm("Are you sure you want to delete this watchlist?")) {
        try {
          setActionError(null);
          await deleteWatchlist.mutateAsync(watchlistId);
          if (selectedWatchlistId === watchlistId) {
            const remaining =
              data?.watchlists.filter((w) => w.id !== watchlistId) || [];
            setSelectedWatchlistId(
              remaining.length > 0 ? remaining[0].id : null,
            );
          }
        } catch (err) {
          console.error("Failed to delete watchlist:", err);
          setActionError("Could not delete the watchlist. Please try again.");
        }
      }
    },
    [deleteWatchlist, selectedWatchlistId, data, setSelectedWatchlistId],
  );

  const handleRenameWatchlist = useCallback(
    async (watchlistId: string, name: string) => {
      try {
        await renameWatchlist.mutateAsync({
          watchlistId,
          request: { name },
        });
      } catch (err) {
        console.error("Failed to rename watchlist:", err);
        throw err;
      }
    },
    [renameWatchlist],
  );

  const handleRemoveTicker = useCallback(
    async (ticker: string) => {
      if (!selectedWatchlistId) return;
      try {
        setActionError(null);
        await removeTickerFromWatchlist.mutateAsync({
          watchlistId: selectedWatchlistId,
          ticker,
        });
        clearTimeout(undoTimerRef.current);
        setRemovedTicker({
          ticker,
          watchlistId: selectedWatchlistId,
          watchlistName: selectedWatchlist?.name ?? "",
        });
        undoTimerRef.current = setTimeout(
          () => setRemovedTicker(null),
          UNDO_NOTICE_MS,
        );
        if (selectedTicker === ticker) {
          const remaining = tickers.filter((t) => t !== ticker);
          setSelectedTicker(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (err) {
        console.error("Failed to remove ticker:", err);
        dismissRemovedTicker();
        setActionError("Could not remove the ticker. Please try again.");
      }
    },
    [
      selectedWatchlistId,
      selectedWatchlist,
      selectedTicker,
      tickers,
      removeTickerFromWatchlist,
      setSelectedTicker,
      dismissRemovedTicker,
    ],
  );

  const handleUndoRemove = useCallback(async () => {
    if (!removedTicker || addTickerToWatchlist.isPending) return;
    clearTimeout(undoTimerRef.current);
    try {
      setActionError(null);
      await addTickerToWatchlist.mutateAsync({
        watchlistId: removedTicker.watchlistId,
        request: { ticker: removedTicker.ticker },
      });
      if (removedTickerRef.current === removedTicker) dismissRemovedTicker();
    } catch (err) {
      console.error("Failed to undo ticker removal:", err);
      setActionError("Could not restore the ticker. Please try again.");
    }
  }, [removedTicker, addTickerToWatchlist, dismissRemovedTicker]);

  const handleAddTicker = useCallback(
    async (ticker: string) => {
      if (!selectedWatchlistId) return;
      await addTickerToWatchlist.mutateAsync({
        watchlistId: selectedWatchlistId,
        request: { ticker },
      });
    },
    [selectedWatchlistId, addTickerToWatchlist],
  );

  const moveTickerBetween = useCallback(
    async (
      sourceWatchlistId: string,
      targetWatchlistId: string,
      ticker: string,
    ) => {
      if (sourceWatchlistId === targetWatchlistId) return;
      try {
        setActionError(null);
        await moveTicker.mutateAsync({
          sourceWatchlistId,
          targetWatchlistId,
          ticker,
        });
        if (
          sourceWatchlistId === selectedWatchlistId &&
          selectedTicker === ticker
        ) {
          const remaining = tickers.filter((t) => t !== ticker);
          setSelectedTicker(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (err) {
        console.error("Failed to move ticker:", err);
        setActionError("Could not move the ticker. Please try again.");
      }
    },
    [
      selectedWatchlistId,
      selectedTicker,
      tickers,
      moveTicker,
      setSelectedTicker,
    ],
  );

  const handleMoveTicker = useCallback(
    async (ticker: string, targetWatchlistId: string) => {
      if (!selectedWatchlistId) return;
      await moveTickerBetween(selectedWatchlistId, targetWatchlistId, ticker);
    },
    [selectedWatchlistId, moveTickerBetween],
  );

  const handleDropTickerOnWatchlist = useCallback(
    (targetWatchlistId: string, ticker: string, sourceWatchlistId: string) => {
      void moveTickerBetween(sourceWatchlistId, targetWatchlistId, ticker);
    },
    [moveTickerBetween],
  );

  const handleCopyTicker = useCallback(
    async (ticker: string, targetWatchlistId: string) => {
      try {
        setActionError(null);
        await copyTicker.mutateAsync({ targetWatchlistId, ticker });
      } catch (err) {
        console.error("Failed to copy ticker:", err);
        setActionError("Could not copy the ticker. Please try again.");
      }
    },
    [copyTicker],
  );

  const otherWatchlists = useMemo(
    () =>
      (data?.watchlists ?? [])
        .filter((w) => w.id !== selectedWatchlistId)
        .map((w) => ({ id: w.id, name: w.name })),
    [data, selectedWatchlistId],
  );

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:h-screen">
          <WatchlistCardBar
            watchlists={data?.watchlists ?? []}
            selectedWatchlistId={selectedWatchlistId}
            isLoading={isLoading}
            onSelectWatchlist={setSelectedWatchlistId}
            onDeleteWatchlist={handleDeleteWatchlist}
            onCreateWatchlist={handleCreateWatchlist}
            onRenameWatchlist={handleRenameWatchlist}
            onDropTicker={handleDropTickerOnWatchlist}
          />

          {actionError && (
            <div className="px-4 pt-3">
              <Alert
                variant="danger"
                className="flex items-center justify-between gap-3 py-3"
              >
                <AlertDescription>{actionError}</AlertDescription>
                <button
                  type="button"
                  aria-label="Dismiss error"
                  onClick={() => setActionError(null)}
                  className="shrink-0 rounded p-1 hover:bg-danger-100 dark:hover:bg-danger-900/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            </div>
          )}

          {removedTicker && (
            <div className="px-4 pt-3">
              <Alert
                variant="info"
                className="flex items-center justify-between gap-3 py-3"
              >
                <AlertDescription>
                  Removed {extractSymbol(removedTicker.ticker)} from{" "}
                  {removedTicker.watchlistName}.{" "}
                  <button
                    type="button"
                    onClick={handleUndoRemove}
                    disabled={addTickerToWatchlist.isPending}
                    className="font-medium underline"
                  >
                    Undo
                  </button>
                </AlertDescription>
                <button
                  type="button"
                  aria-label="Dismiss notice"
                  onClick={dismissRemovedTicker}
                  className="shrink-0 rounded p-1 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            </div>
          )}

          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {selectedWatchlist && (
              <TickerSidebar
                tickers={tickers}
                selectedTicker={selectedTicker}
                isLoading={isLoading}
                error={error}
                isAddingTicker={addTickerToWatchlist.isPending}
                sourceWatchlistId={selectedWatchlist.id}
                otherWatchlists={otherWatchlists}
                onTickerSelect={setSelectedTicker}
                onRemoveTicker={handleRemoveTicker}
                onAddTicker={handleAddTicker}
                onMoveTicker={handleMoveTicker}
                onCopyTicker={handleCopyTicker}
                tickerRefs={tickerRefs}
                listContainerRef={listContainerRef}
              />
            )}

            <ChartPanel
              symbol={symbolToFetch}
              selectedTicker={selectedTicker}
              selectedWatchlist={selectedWatchlist}
              isLoadingWatchlists={isLoading}
              watchlistsError={error}
              chartProps={chartProps}
              movingAverages={movingAverages}
              financialData={financialData}
              financialLoading={financialLoading}
              financialError={financialError}
              onFinancialRetry={() => refetchFinancials()}
              spyCandles={spyCandles}
              interval={interval}
              onIntervalChange={setInterval}
              onLoadMoreSpy={loadMoreSpy}
              isLoadingMoreSpy={isLoadingMoreSpy}
              includeExtendedHours={includeExtendedHours}
              onIncludeExtendedHoursChange={setIncludeExtendedHours}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
