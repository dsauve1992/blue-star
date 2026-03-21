CREATE TABLE rs_ratings (
    id UUID PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    rs_rating SMALLINT NOT NULL CHECK (rs_rating BETWEEN 1 AND 99),
    weighted_score NUMERIC(10, 4) NOT NULL,
    computed_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (symbol, computed_at)
);

CREATE INDEX idx_rs_ratings_symbol ON rs_ratings (symbol);
CREATE INDEX idx_rs_ratings_computed_at ON rs_ratings (computed_at DESC);
