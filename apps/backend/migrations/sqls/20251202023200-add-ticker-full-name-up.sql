ALTER TABLE consolidation_results ADD COLUMN ticker_full_name VARCHAR(255);
UPDATE consolidation_results SET ticker_full_name = symbol WHERE ticker_full_name IS NULL;
ALTER TABLE consolidation_results ALTER COLUMN ticker_full_name SET NOT NULL;
