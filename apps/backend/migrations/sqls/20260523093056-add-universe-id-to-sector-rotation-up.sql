-- Add universe_id to sector_rotation_data_points and migrate existing rows to
-- the GICS-sector universe (the only universe that existed before this change).
ALTER TABLE sector_rotation_data_points
    ADD COLUMN universe_id VARCHAR(64);

UPDATE sector_rotation_data_points SET universe_id = 'gics-sector' WHERE universe_id IS NULL;

ALTER TABLE sector_rotation_data_points
    ALTER COLUMN universe_id SET NOT NULL;

-- Replace the old (date, sector_symbol) unique key with one scoped by universe.
ALTER TABLE sector_rotation_data_points
    DROP CONSTRAINT IF EXISTS sector_rotation_data_points_date_sector_symbol_key;

ALTER TABLE sector_rotation_data_points
    ADD CONSTRAINT sector_rotation_data_points_universe_date_symbol_key
    UNIQUE (universe_id, date, sector_symbol);

-- Replace the old composite index with one that leads with universe.
DROP INDEX IF EXISTS idx_sector_rotation_data_points_date_sector;
CREATE INDEX IF NOT EXISTS idx_sector_rotation_data_points_universe_date_sector
    ON sector_rotation_data_points (universe_id, date, sector_symbol);
