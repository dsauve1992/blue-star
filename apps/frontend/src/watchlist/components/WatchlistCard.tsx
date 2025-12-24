import { Badge, Button, Card } from 'src/global/design-system';
import { Plus, Trash2, X } from 'lucide-react';
import type { Watchlist } from '../api/watchlist.client';

export interface WatchlistCardProps {
  watchlist: Watchlist;
  onAddTicker: () => void;
  onRemoveTicker: (ticker: string) => void;
  onDelete: () => void;
}

export function WatchlistCard({
  watchlist,
  onAddTicker,
  onRemoveTicker,
  onDelete,
}: WatchlistCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {watchlist.name}
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {watchlist.tickers.length} ticker{watchlist.tickers.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onAddTicker}>
            <Plus className="h-4 w-4 mr-1" />
            Add Ticker
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {watchlist.tickers.length === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <p>No tickers in this watchlist yet.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={onAddTicker}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Your First Ticker
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {watchlist.tickers.map((ticker) => (
            <Badge
              key={ticker}
              variant="default"
              className="flex items-center gap-1 px-3 py-1"
            >
              <span>{ticker}</span>
              <button
                onClick={() => onRemoveTicker(ticker)}
                className="ml-1 hover:bg-slate-700 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${ticker}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

