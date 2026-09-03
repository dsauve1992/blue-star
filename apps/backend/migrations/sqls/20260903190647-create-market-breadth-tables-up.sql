CREATE TABLE market_breadth_universe_membership (
    id UUID PRIMARY KEY,
    scan_date DATE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (scan_date, symbol)
);

CREATE INDEX idx_market_breadth_membership_scan_date ON market_breadth_universe_membership (scan_date);

CREATE TABLE market_breadth_daily_aggregates (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    universe_size INTEGER NOT NULL,
    new_highs INTEGER NOT NULL,
    new_lows INTEGER NOT NULL,
    missing_symbols JSONB NOT NULL DEFAULT '[]',
    partial BOOLEAN NOT NULL DEFAULT FALSE,
    backfilled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (date)
);

CREATE INDEX idx_market_breadth_aggregates_date ON market_breadth_daily_aggregates (date DESC);
