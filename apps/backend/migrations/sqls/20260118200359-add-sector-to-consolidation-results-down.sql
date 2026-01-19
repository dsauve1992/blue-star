-- Remove sector and industry columns from consolidation_results table
DROP INDEX IF EXISTS idx_consolidation_results_sector;

ALTER TABLE consolidation_results 
DROP COLUMN IF EXISTS sector,
DROP COLUMN IF EXISTS industry;
