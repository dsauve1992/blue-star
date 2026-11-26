CREATE TABLE potent_member_tiers (
    member_id UUID NOT NULL REFERENCES potent_cluster_members (id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    tier VARCHAR(10) NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    ema9 DOUBLE PRECISION NOT NULL,
    ema21 DOUBLE PRECISION NOT NULL,
    ema50 DOUBLE PRECISION NOT NULL,
    adr_pct DOUBLE PRECISION,
    PRIMARY KEY (member_id, session_date)
);
