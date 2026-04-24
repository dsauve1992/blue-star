CREATE TABLE leader_scan_runs (
    id UUID PRIMARY KEY,
    scan_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    universe_size INTEGER,
    leader_count INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (scan_date)
);

CREATE INDEX idx_leader_scan_runs_scan_date ON leader_scan_runs (scan_date DESC);

CREATE TABLE leader_scan_results (
    id UUID PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    scan_date DATE NOT NULL,
    exchange VARCHAR(16),
    sector VARCHAR(64),
    perf_1m NUMERIC(10, 6) NOT NULL,
    perf_3m NUMERIC(10, 6) NOT NULL,
    perf_6m NUMERIC(10, 6) NOT NULL,
    rank_1m NUMERIC(6, 5) NOT NULL,
    rank_3m NUMERIC(6, 5) NOT NULL,
    rank_6m NUMERIC(6, 5) NOT NULL,
    rs_score NUMERIC(6, 5) NOT NULL,
    adr_20 NUMERIC(8, 3) NOT NULL,
    dollar_volume_20 NUMERIC(18, 2) NOT NULL,
    top_1m_flag BOOLEAN NOT NULL,
    top_3m_flag BOOLEAN NOT NULL,
    top_6m_flag BOOLEAN NOT NULL,
    small_size_flag BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (symbol, scan_date)
);

CREATE INDEX idx_leader_scan_results_scan_date ON leader_scan_results (scan_date DESC);
CREATE INDEX idx_leader_scan_results_symbol ON leader_scan_results (symbol);
CREATE INDEX idx_leader_scan_results_rs_score ON leader_scan_results (scan_date DESC, rs_score DESC);
