-- Add sector and industry columns to consolidation_results table
ALTER TABLE consolidation_results 
ADD COLUMN sector VARCHAR(100),
ADD COLUMN industry VARCHAR(100);

-- Create index for sector filtering
CREATE INDEX IF NOT EXISTS idx_consolidation_results_sector ON consolidation_results(sector);
