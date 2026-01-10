-- Create market_data_cache table
CREATE TABLE IF NOT EXISTS market_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL CHECK (interval IN ('1d', '1wk', '1mo')),
    date DATE NOT NULL,
    open DECIMAL(15,4) NOT NULL,
    high DECIMAL(15,4) NOT NULL,
    low DECIMAL(15,4) NOT NULL,
    close DECIMAL(15,4) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, interval, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_cache_symbol ON market_data_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_interval ON market_data_cache(interval);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_date ON market_data_cache(date);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_symbol_interval_date ON market_data_cache(symbol, interval, date DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_data_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_market_data_cache_updated_at 
    BEFORE UPDATE ON market_data_cache 
    FOR EACH ROW 
    EXECUTE FUNCTION update_market_data_cache_updated_at();

