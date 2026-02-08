import { useRef, useMemo, useCallback } from "react";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
  useDeleteWatchlist,
} from "../hooks/use-watchlists";
import { useWatchlistSelection } from "../hooks/use-watchlist-selection";
import { useTickerKeyboardNavigation } from "../hooks/use-ticker-keyboard-navigation";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import { PageContainer } from "src/global/design-system/page-container";
import { WatchlistCardBar } from "../components/WatchlistCardBar";
import { TickerSidebar } from "../components/TickerSidebar";
import { ChartPanel } from "../components/ChartPanel";

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

  const {
    selectedWatchlistId,
    setSelectedWatchlistId,
    selectedTicker,
    setSelectedTicker,
    selectedWatchlist,
    tickers,
  } = useWatchlistSelection({ data });

  const listContainerRef = useRef<HTMLDivElement>(null);
  const tickerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useTickerKeyboardNavigation({
    tickers,
    selectedTicker,
    onTickerChange: setSelectedTicker,
    tickerRefs,
    listContainerRef,
  });

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

  const handleCreateWatchlist = useCallback(
    async (name: string) => {
      try {
        const response = await createWatchlist.mutateAsync({ name });
        setSelectedWatchlistId(response.watchlistId);
      } catch (err) {
        console.error("Failed to create watchlist:", err);
      }
    },
    [createWatchlist, setSelectedWatchlistId],
  );

  const handleDeleteWatchlist = useCallback(
    async (watchlistId: string) => {
      if (window.confirm("Are you sure you want to delete this watchlist?")) {
        try {
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
        }
      }
    },
    [deleteWatchlist, selectedWatchlistId, data, setSelectedWatchlistId],
  );

  const handleRemoveTicker = useCallback(
    async (ticker: string) => {
      if (!selectedWatchlistId) return;
      try {
        await removeTickerFromWatchlist.mutateAsync({
          watchlistId: selectedWatchlistId,
          ticker,
        });
        if (selectedTicker === ticker) {
          const remaining = tickers.filter((t) => t !== ticker);
          setSelectedTicker(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (err) {
        console.error("Failed to remove ticker:", err);
      }
    },
    [
      selectedWatchlistId,
      selectedTicker,
      tickers,
      removeTickerFromWatchlist,
      setSelectedTicker,
    ],
  );

  const handleAddTicker = useCallback(
    async (ticker: string) => {
      if (!selectedWatchlistId) return;
      try {
        await addTickerToWatchlist.mutateAsync({
          watchlistId: selectedWatchlistId,
          request: { ticker },
        });
      } catch (err) {
        console.error("Failed to add ticker:", err);
      }
    },
    [selectedWatchlistId, addTickerToWatchlist],
  );

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col h-screen">
          <WatchlistCardBar
            watchlists={data?.watchlists ?? []}
            selectedWatchlistId={selectedWatchlistId}
            isLoading={isLoading}
            onSelectWatchlist={setSelectedWatchlistId}
            onDeleteWatchlist={handleDeleteWatchlist}
            onCreateWatchlist={handleCreateWatchlist}
          />

          <div className="flex-1 flex min-h-0">
            {selectedWatchlist && (
              <TickerSidebar
                tickers={tickers}
                selectedTicker={selectedTicker}
                isLoading={isLoading}
                error={error}
                isAddingTicker={addTickerToWatchlist.isPending}
                onTickerSelect={setSelectedTicker}
                onRemoveTicker={handleRemoveTicker}
                onAddTicker={handleAddTicker}
                tickerRefs={tickerRefs}
                listContainerRef={listContainerRef}
              />
            )}

            <ChartPanel
              selectedTicker={selectedTicker}
              selectedWatchlist={selectedWatchlist}
              tradingViewProps={tradingViewProps}
              movingAverages={movingAverages}
              financialData={financialData}
              financialLoading={financialLoading}
              financialError={financialError}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
