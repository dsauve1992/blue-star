CREATE TABLE potent_hit_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date DATE NOT NULL REFERENCES potent_scans (scan_date) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    business TEXT NOT NULL,
    catalyst_today TEXT NOT NULL,
    catalyst_type VARCHAR(20) NOT NULL CHECK (
        catalyst_type IN ('earnings', 'guidance', 'sector', 'upgrade', 'm&a', 'none', 'other')
    ),
    source TEXT,
    model VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (scan_date, symbol)
);

CREATE TABLE potent_research_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('succeeded', 'failed')),
    hit_count INTEGER NOT NULL,
    researched_count INTEGER NOT NULL,
    missing_symbols TEXT[] NOT NULL,
    headline_fetch_errors TEXT[] NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    web_search_requests INTEGER NOT NULL,
    cost_usd NUMERIC(10, 6) NOT NULL,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_potent_research_runs_scan_date ON potent_research_runs (scan_date);
