-- Drop indexes
DROP INDEX IF EXISTS idx_sector_rotation_data_points_date_sector;
DROP INDEX IF EXISTS idx_sector_rotation_data_points_sector_symbol;
DROP INDEX IF EXISTS idx_sector_rotation_data_points_date;

-- Drop sector_rotation_data_points table
DROP TABLE IF EXISTS sector_rotation_data_points;
