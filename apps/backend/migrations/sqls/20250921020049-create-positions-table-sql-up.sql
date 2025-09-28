-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    portfolio_id UUID NOT NULL,
    instrument VARCHAR(10) NOT NULL,
    current_qty INTEGER NOT NULL DEFAULT 0,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create position_events table for event sourcing
CREATE TABLE IF NOT EXISTS position_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('BUY', 'SELL', 'STOP_LOSS')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    portfolio_id UUID NOT NULL,
    instrument VARCHAR(10) NOT NULL,
    quantity INTEGER,
    price DECIMAL(15,4),
    stop_price DECIMAL(15,4),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_instrument ON positions(instrument);
CREATE INDEX IF NOT EXISTS idx_positions_closed ON positions(closed);
CREATE INDEX IF NOT EXISTS idx_position_events_position_id ON position_events(position_id);
CREATE INDEX IF NOT EXISTS idx_position_events_timestamp ON position_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_position_events_action ON position_events(action);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_positions_updated_at 
    BEFORE UPDATE ON positions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();