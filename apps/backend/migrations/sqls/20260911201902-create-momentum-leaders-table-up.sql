CREATE TABLE momentum_leaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date DATE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    sector VARCHAR(100),
    perf_1m NUMERIC(10, 4) NOT NULL,
    perf_3m NUMERIC(10, 4) NOT NULL,
    perf_6m NUMERIC(10, 4) NOT NULL,
    rank_1m NUMERIC(6, 2) NOT NULL,
    rank_3m NUMERIC(6, 2) NOT NULL,
    rank_6m NUMERIC(6, 2) NOT NULL,
    rs_score NUMERIC(6, 2) NOT NULL,
    top_1m BOOLEAN NOT NULL,
    top_3m BOOLEAN NOT NULL,
    top_6m BOOLEAN NOT NULL,
    universe_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (scan_date, symbol)
);

CREATE INDEX idx_momentum_leaders_scan_date ON momentum_leaders (scan_date DESC);
