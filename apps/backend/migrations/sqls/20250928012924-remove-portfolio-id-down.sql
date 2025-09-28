-- Restore portfolio_id column and related index to positions table
ALTER TABLE positions ADD COLUMN portfolio_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);

-- Restore portfolio_id column to position_events table
ALTER TABLE position_events ADD COLUMN portfolio_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';