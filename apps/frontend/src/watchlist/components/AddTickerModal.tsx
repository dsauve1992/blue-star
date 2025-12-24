import { useState } from 'react';
import { Button, Input, Label } from 'src/global/design-system';
import { useAddTickerToWatchlist } from '../hooks/use-watchlists';
import { X } from 'lucide-react';
import type { Watchlist } from '../api/watchlist.client';

export interface AddTickerModalProps {
  watchlist: Watchlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AddTickerModal({
  watchlist,
  isOpen,
  onClose,
}: AddTickerModalProps) {
  const [ticker, setTicker] = useState('');
  const addTicker = useAddTickerToWatchlist();

  if (!isOpen || !watchlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    try {
      await addTicker.mutateAsync({
        watchlistId: watchlist.id,
        request: { ticker: ticker.trim().toUpperCase() },
      });
      setTicker('');
      onClose();
    } catch (error) {
      console.error('Failed to add ticker:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Add Ticker to {watchlist.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ticker-input">Ticker Symbol</Label>
            <Input
              id="ticker-input"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g., NASDAQ:GOOGL or AAPL"
              required
              maxLength={50}
              disabled={addTicker.isPending}
              autoFocus
            />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Supports exchange prefix format (e.g., NASDAQ:GOOGL) or simple
              format (e.g., AAPL)
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!ticker.trim() || addTicker.isPending}
            >
              {addTicker.isPending ? 'Adding...' : 'Add Ticker'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

