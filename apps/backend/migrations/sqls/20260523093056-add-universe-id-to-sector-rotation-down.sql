DROP INDEX IF EXISTS idx_sector_rotation_data_points_universe_date_sector;

ALTER TABLE sector_rotation_data_points
    DROP CONSTRAINT IF EXISTS sector_rotation_data_points_universe_date_symbol_key;

CREATE INDEX IF NOT EXISTS idx_sector_rotation_data_points_date_sector
    ON sector_rotation_data_points (date, sector_symbol);

ALTER TABLE sector_rotation_data_points
    ADD CONSTRAINT sector_rotation_data_points_date_sector_symbol_key
    UNIQUE (date, sector_symbol);

ALTER TABLE sector_rotation_data_points DROP COLUMN universe_id;
