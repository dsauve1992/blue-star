-- Drop trigger
DROP TRIGGER IF EXISTS update_watchlists_updated_at ON watchlists;

-- Drop function
DROP FUNCTION IF EXISTS update_watchlists_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_watchlist_tickers_ticker;
DROP INDEX IF EXISTS idx_watchlist_tickers_watchlist_id;
DROP INDEX IF EXISTS idx_watchlists_user_id;

-- Drop tables
DROP TABLE IF EXISTS watchlist_tickers;
DROP TABLE IF EXISTS watchlists;

