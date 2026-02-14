CREATE TABLE IF NOT EXISTS watchlist_monitoring (
    id UUID PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watchlist_monitoring_watchlist_type UNIQUE (watchlist_id, type)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_monitoring_watchlist_id ON watchlist_monitoring(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_monitoring_active ON watchlist_monitoring(active);
CREATE INDEX IF NOT EXISTS idx_watchlist_monitoring_type ON watchlist_monitoring(type);
