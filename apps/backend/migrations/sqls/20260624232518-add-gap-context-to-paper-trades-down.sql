ALTER TABLE paper_trades
    DROP COLUMN IF EXISTS industry_group_quadrant,
    DROP COLUMN IF EXISTS industry_group_rs_rating,
    DROP COLUMN IF EXISTS global_rs_rating,
    DROP COLUMN IF EXISTS industry_group;