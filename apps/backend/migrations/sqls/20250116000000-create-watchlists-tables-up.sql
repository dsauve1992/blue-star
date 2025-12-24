-- Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create watchlist_tickers table
CREATE TABLE IF NOT EXISTS watchlist_tickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    ticker VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(watchlist_id, ticker)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tickers_watchlist_id ON watchlist_tickers(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tickers_ticker ON watchlist_tickers(ticker);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watchlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_watchlists_updated_at 
    BEFORE UPDATE ON watchlists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_watchlists_updated_at();

