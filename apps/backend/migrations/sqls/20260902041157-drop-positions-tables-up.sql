DROP INDEX IF EXISTS idx_position_events_position_id;
DROP INDEX IF EXISTS idx_position_events_timestamp;
DROP INDEX IF EXISTS idx_position_events_action;
DROP INDEX IF EXISTS idx_positions_user_id;
DROP INDEX IF EXISTS idx_positions_instrument;
DROP INDEX IF EXISTS idx_positions_closed;

DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;

DROP TABLE IF EXISTS position_events;
DROP TABLE IF EXISTS positions;

DROP FUNCTION IF EXISTS update_updated_at_column();
