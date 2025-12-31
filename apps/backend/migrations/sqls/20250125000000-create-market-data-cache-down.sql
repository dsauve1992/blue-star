-- Drop trigger
DROP TRIGGER IF EXISTS update_market_data_cache_updated_at ON market_data_cache;

-- Drop function
DROP FUNCTION IF EXISTS update_market_data_cache_updated_at();

-- Drop table
DROP TABLE IF EXISTS market_data_cache;

