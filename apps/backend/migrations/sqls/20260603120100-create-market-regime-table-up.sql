CREATE TABLE IF NOT EXISTS market_regime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(10) NOT NULL CHECK (state IN ('GREEN', 'YELLOW', 'RED')),
    market_health_status VARCHAR(10) NOT NULL CHECK (market_health_status IN ('GOOD', 'WARNING', 'BAD')),
    leader_count INTEGER NOT NULL,
    leader_count_ma INTEGER NOT NULL,
    breadth_signal VARCHAR(20) NOT NULL CHECK (breadth_signal IN ('EXPANDING', 'NEUTRAL', 'CONTRACTING')),
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_regime_computed_at ON market_regime (computed_at DESC);
