import { WatchlistList } from '../components/WatchlistList';
import { CreateWatchlistForm } from '../components/CreateWatchlistForm';
import { PageContainer } from 'src/global/design-system/page-container';

export default function Watchlist() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Watchlists
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Create and manage your ticker watchlists
          </p>
        </div>

        <CreateWatchlistForm />

        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Your Watchlists
          </h2>
          <WatchlistList />
        </div>
      </div>
    </PageContainer>
  );
}

