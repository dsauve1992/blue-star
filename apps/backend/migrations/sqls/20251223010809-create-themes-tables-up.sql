-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create theme_tickers table
CREATE TABLE IF NOT EXISTS theme_tickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(theme_id, ticker)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_theme_tickers_theme_id ON theme_tickers(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_tickers_ticker ON theme_tickers(ticker);
CREATE INDEX IF NOT EXISTS idx_themes_name ON themes(name);

