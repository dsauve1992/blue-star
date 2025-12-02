const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class AddTickerFullNameToConsolidationResults20251202023200 {
    async up(queryRunner) {
        await queryRunner.query(
            `ALTER TABLE consolidation_results ADD COLUMN ticker_full_name VARCHAR(255)`
        );
        // Update existing records to have a default value or copy from symbol if appropriate
        // For now, we'll leave it nullable or empty string if not nullable, but since we just added it, it's nullable by default unless specified otherwise.
        // Let's make it NOT NULL and default to empty string for existing records to avoid issues, or just nullable.
        // Given the previous schema, let's check if we want it nullable.
        // The entity definition implies it's required (string, not string | null).
        // So we should probably make it NOT NULL.

        await queryRunner.query(
            `UPDATE consolidation_results SET ticker_full_name = symbol WHERE ticker_full_name IS NULL`
        );

        await queryRunner.query(
            `ALTER TABLE consolidation_results ALTER COLUMN ticker_full_name SET NOT NULL`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(
            `ALTER TABLE consolidation_results DROP COLUMN ticker_full_name`
        );
    }
};
