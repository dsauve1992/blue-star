CREATE TABLE potent_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date DATE NOT NULL UNIQUE,
    universe_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE potent_scan_hits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES potent_scans (id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    change_pct DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION,
    adr_pct DOUBLE PRECISION,
    relative_volume DOUBLE PRECISION,
    market_cap DOUBLE PRECISION,
    sector VARCHAR(100) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    ema9 DOUBLE PRECISION,
    ema21 DOUBLE PRECISION,
    ema50 DOUBLE PRECISION,
    tier VARCHAR(10),
    UNIQUE (scan_id, symbol)
);

CREATE TABLE potent_scan_near_misses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES potent_scans (id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    change_pct DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION,
    adr_pct DOUBLE PRECISION,
    relative_volume DOUBLE PRECISION,
    market_cap DOUBLE PRECISION,
    sector VARCHAR(100) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    ema9 DOUBLE PRECISION,
    ema21 DOUBLE PRECISION,
    ema50 DOUBLE PRECISION,
    tier VARCHAR(10),
    value_traded DOUBLE PRECISION,
    avg_value_traded_30d DOUBLE PRECISION,
    UNIQUE (scan_id, symbol)
);

