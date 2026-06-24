CREATE TABLE IF NOT EXISTS paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(20) NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
    shares INTEGER NOT NULL CHECK (shares > 0),
    entry_price DECIMAL(15,4) NOT NULL CHECK (entry_price > 0),
    stop_price DECIMAL(15,4) NOT NULL CHECK (stop_price > 0),
    target_price DECIMAL(15,4) NOT NULL CHECK (target_price > 0),
    risk_per_share DECIMAL(15,4) NOT NULL CHECK (risk_per_share > 0),
    exit_price DECIMAL(15,4) CHECK (exit_price > 0),
    exit_reason VARCHAR(10) CHECK (exit_reason IN ('STOP', 'TARGET')),
    realized_r DECIMAL(15,4),
    pnl DECIMAL(15,4),
    market_date DATE NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT paper_trades_closed_fields CHECK (
        (status = 'OPEN' AND exit_price IS NULL AND exit_reason IS NULL AND closed_at IS NULL AND pnl IS NULL AND realized_r IS NULL)
        OR
        (status = 'CLOSED' AND exit_price IS NOT NULL AND exit_reason IS NOT NULL AND closed_at IS NOT NULL AND pnl IS NOT NULL AND realized_r IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_ticker ON paper_trades(ticker);
CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_trades_open_ticker ON paper_trades(ticker) WHERE status = 'OPEN';
