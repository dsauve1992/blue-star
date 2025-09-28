-- Remove portfolio_id column and related index from positions table
DROP INDEX IF EXISTS idx_positions_portfolio_id;
ALTER TABLE positions DROP COLUMN IF EXISTS portfolio_id;

-- Remove portfolio_id column from position_events table
ALTER TABLE position_events DROP COLUMN IF EXISTS portfolio_id;