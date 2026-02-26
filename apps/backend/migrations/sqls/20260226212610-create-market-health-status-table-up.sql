CREATE TABLE IF NOT EXISTS market_health_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(10) NOT NULL CHECK (status IN ('GOOD', 'WARNING', 'BAD')),
    ema9 DECIMAL(10,4) NOT NULL,
    ema21 DECIMAL(10,4) NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_health_status_computed_at ON market_health_status(computed_at DESC);
