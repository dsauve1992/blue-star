import { useState } from 'react';
import { Button, Card, Input, Label } from 'src/global/design-system';
import { useCreateWatchlist } from '../hooks/use-watchlists';
import { Plus } from 'lucide-react';

export function CreateWatchlistForm() {
  const [name, setName] = useState('');
  const createWatchlist = useCreateWatchlist();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createWatchlist.mutateAsync({ name: name.trim() });
      setName('');
    } catch (error) {
      console.error('Failed to create watchlist:', error);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Create New Watchlist
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="watchlist-name">Watchlist Name</Label>
          <Input
            id="watchlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tech Stocks, Energy Sector"
            required
            maxLength={255}
            disabled={createWatchlist.isPending}
          />
        </div>
        <Button
          type="submit"
          disabled={!name.trim() || createWatchlist.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          {createWatchlist.isPending ? 'Creating...' : 'Create Watchlist'}
        </Button>
      </form>
    </Card>
  );
}

