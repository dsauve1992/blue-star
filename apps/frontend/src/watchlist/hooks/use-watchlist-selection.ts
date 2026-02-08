import { useState, useEffect, useMemo } from "react";
import type { ListWatchlistsResponse } from "../api/watchlist.client";

interface UseWatchlistSelectionParams {
  data: ListWatchlistsResponse | undefined;
}

export function useWatchlistSelection({ data }: UseWatchlistSelectionParams) {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(
    null,
  );
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const selectedWatchlist = data?.watchlists.find(
    (w) => w.id === selectedWatchlistId,
  );
  const tickers = useMemo(
    () => selectedWatchlist?.tickers || [],
    [selectedWatchlist],
  );

  // Auto-select first watchlist when data loads
  useEffect(() => {
    if (
      data?.watchlists &&
      data.watchlists.length > 0 &&
      !selectedWatchlistId
    ) {
      setSelectedWatchlistId(data.watchlists[0].id);
    }
  }, [data, selectedWatchlistId]);

  // Auto-select first ticker when watchlist changes
  useEffect(() => {
    if (selectedWatchlist && tickers.length > 0) {
      if (!selectedTicker || !tickers.includes(selectedTicker)) {
        setSelectedTicker(tickers[0]);
      }
    } else {
      setSelectedTicker(null);
    }
  }, [selectedWatchlist, tickers, selectedTicker]);

  return {
    selectedWatchlistId,
    setSelectedWatchlistId,
    selectedTicker,
    setSelectedTicker,
    selectedWatchlist,
    tickers,
  };
}
