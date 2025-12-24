import { useState } from 'react';
import { useWatchlists, useDeleteWatchlist, useRemoveTickerFromWatchlist } from '../hooks/use-watchlists';
import { Alert, Card, LoadingSpinner } from 'src/global/design-system';
import { List } from 'lucide-react';
import { WatchlistCard } from './WatchlistCard';
import { AddTickerModal } from './AddTickerModal';
import type { Watchlist } from '../api/watchlist.client';

export function WatchlistList() {
  const { data, isLoading, error } = useWatchlists();
  const deleteWatchlist = useDeleteWatchlist();
  const removeTicker = useRemoveTickerFromWatchlist();
  const [activeModal, setActiveModal] = useState<{
    watchlist: Watchlist | null;
  }>({ watchlist: null });

  const handleDelete = async (watchlistId: string) => {
    if (window.confirm('Are you sure you want to delete this watchlist?')) {
      await deleteWatchlist.mutateAsync(watchlistId);
    }
  };

  const handleRemoveTicker = async (watchlistId: string, ticker: string) => {
    await removeTicker.mutateAsync({ watchlistId, ticker });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        Failed to load watchlists. Please try again.
      </Alert>
    );
  }

  if (!data?.watchlists || data.watchlists.length === 0) {
    return (
      <Card className="p-6 text-center">
        <List className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No watchlists yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Create your first watchlist to start tracking tickers.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.watchlists.map((watchlist) => (
        <WatchlistCard
          key={watchlist.id}
          watchlist={watchlist}
          onAddTicker={() => setActiveModal({ watchlist })}
          onRemoveTicker={(ticker) =>
            handleRemoveTicker(watchlist.id, ticker)
          }
          onDelete={() => handleDelete(watchlist.id)}
        />
      ))}

      <AddTickerModal
        watchlist={activeModal.watchlist}
        isOpen={!!activeModal.watchlist}
        onClose={() => setActiveModal({ watchlist: null })}
      />
    </div>
  );
}

