CREATE TABLE industry_group_rs_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    industry_group VARCHAR(100) NOT NULL,
    rs_rating SMALLINT NOT NULL CHECK (rs_rating BETWEEN 1 AND 99),
    weighted_score NUMERIC(10, 4) NOT NULL,
    group_size SMALLINT NOT NULL,
    computed_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (symbol, computed_at)
);

CREATE INDEX idx_industry_group_rs_ratings_symbol ON industry_group_rs_ratings (symbol);
CREATE INDEX idx_industry_group_rs_ratings_group_date ON industry_group_rs_ratings (industry_group, computed_at DESC);
CREATE INDEX idx_industry_group_rs_ratings_computed_at ON industry_group_rs_ratings (computed_at DESC);
