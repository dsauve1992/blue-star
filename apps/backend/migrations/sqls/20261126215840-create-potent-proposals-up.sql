CREATE TABLE potent_proposals (
    id UUID PRIMARY KEY,
    scan_date DATE NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('new_cluster', 'addition')),
    status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'accepted', 'edited', 'rejected')),
    content JSONB NOT NULL,
    applied_alternative INTEGER,
    cluster_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    decided_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_potent_proposals_scan_date ON potent_proposals (scan_date);

CREATE TABLE potent_proposal_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('succeeded', 'failed')),
    model VARCHAR(50) NOT NULL,
    proposal_count INTEGER NOT NULL,
    unclustered JSONB NOT NULL,
    dropped TEXT[] NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd NUMERIC(10, 6) NOT NULL,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_potent_proposal_runs_scan_date ON potent_proposal_runs (scan_date);
