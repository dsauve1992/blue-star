CREATE TABLE IF NOT EXISTS stock_classification (
  ticker VARCHAR(32) PRIMARY KEY,
  sector VARCHAR(100),
  industry VARCHAR(200),
  industry_key VARCHAR(100),
  industry_group VARCHAR(100),
  classified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_classification_industry_group
  ON stock_classification(industry_group);
