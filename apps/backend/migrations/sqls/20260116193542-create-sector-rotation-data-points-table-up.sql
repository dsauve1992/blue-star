-- Create sector_rotation_data_points table
CREATE TABLE IF NOT EXISTS sector_rotation_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    sector_symbol VARCHAR(20) NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    relative_strength DECIMAL(15,4) NOT NULL,
    x DECIMAL(15,4) NOT NULL,
    y DECIMAL(15,4) NOT NULL,
    quadrant VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(date, sector_symbol)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sector_rotation_data_points_date ON sector_rotation_data_points(date);
CREATE INDEX IF NOT EXISTS idx_sector_rotation_data_points_sector_symbol ON sector_rotation_data_points(sector_symbol);
CREATE INDEX IF NOT EXISTS idx_sector_rotation_data_points_date_sector ON sector_rotation_data_points(date, sector_symbol);
