-- Drop indexes
DROP INDEX IF EXISTS idx_theme_tickers_theme_id;
DROP INDEX IF EXISTS idx_theme_tickers_ticker;
DROP INDEX IF EXISTS idx_themes_name;

-- Drop tables
DROP TABLE IF EXISTS theme_tickers;
DROP TABLE IF EXISTS themes;

