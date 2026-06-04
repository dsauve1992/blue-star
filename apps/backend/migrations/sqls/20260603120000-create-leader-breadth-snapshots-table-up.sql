CREATE TABLE IF NOT EXISTS leader_breadth_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_count INTEGER NOT NULL,
    total_universe INTEGER NOT NULL,
    rs_threshold SMALLINT NOT NULL,
    computed_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (computed_at, rs_threshold)
);

CREATE INDEX IF NOT EXISTS idx_leader_breadth_snapshots_computed_at ON leader_breadth_snapshots (computed_at DESC);
