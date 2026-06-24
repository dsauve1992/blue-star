ALTER TABLE paper_trades
    ADD COLUMN industry_group VARCHAR(100),
    ADD COLUMN global_rs_rating SMALLINT CHECK (global_rs_rating BETWEEN 1 AND 99),
    ADD COLUMN industry_group_rs_rating SMALLINT CHECK (industry_group_rs_rating BETWEEN 1 AND 99),
    ADD COLUMN industry_group_quadrant VARCHAR(10) CHECK (
        industry_group_quadrant IN ('Leading', 'Weakening', 'Lagging', 'Improving')
    );