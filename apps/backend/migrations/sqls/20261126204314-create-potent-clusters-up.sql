CREATE TABLE potent_clusters (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    shared_catalyst TEXT,
    sources TEXT[] NOT NULL DEFAULT '{}',
    origin_proposal_id UUID,
    source_scan_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_potent_clusters_status ON potent_clusters (status);

CREATE TABLE potent_cluster_members (
    id UUID PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES potent_clusters (id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    catalyst TEXT,
    source TEXT,
    removed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_potent_cluster_members_cluster_id ON potent_cluster_members (cluster_id);

CREATE UNIQUE INDEX idx_potent_cluster_members_active_ticker
    ON potent_cluster_members (cluster_id, ticker)
    WHERE removed_at IS NULL;
