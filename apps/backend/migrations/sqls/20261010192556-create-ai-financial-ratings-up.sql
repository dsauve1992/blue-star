CREATE TABLE ai_financial_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  model VARCHAR(100) NOT NULL,
  rating JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_financial_ratings_symbol_fingerprint_key UNIQUE (symbol, request_fingerprint)
);
