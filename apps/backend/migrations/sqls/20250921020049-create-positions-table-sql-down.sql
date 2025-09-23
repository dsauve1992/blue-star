-- Drop trigger and function
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_position_events_action;
DROP INDEX IF EXISTS idx_position_events_timestamp;
DROP INDEX IF EXISTS idx_position_events_position_id;
DROP INDEX IF EXISTS idx_position_events_closed;
DROP INDEX IF EXISTS idx_positions_instrument;
DROP INDEX IF EXISTS idx_positions_portfolio_id;
DROP INDEX IF EXISTS idx_positions_user_id;

-- Drop tables
DROP TABLE IF EXISTS position_events;
DROP TABLE IF EXISTS positions;