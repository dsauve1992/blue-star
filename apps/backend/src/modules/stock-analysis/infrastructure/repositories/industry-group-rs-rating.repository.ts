import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { IndustryGroupRsRatingRepository } from '../../domain/repositories/industry-group-rs-rating.repository.interface';
import { IndustryGroupRsRating } from '../../domain/value-objects/industry-group-rs-rating';

interface IndustryGroupRsRatingRow {
  id: string;
  symbol: string;
  industry_group: string;
  rs_rating: number;
  weighted_score: string;
  group_size: number;
  computed_at: string;
  created_at: string;
}

@Injectable()
export class IndustryGroupRsRatingRepositoryImpl
  implements IndustryGroupRsRatingRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async saveRatings(ratings: IndustryGroupRsRating[]): Promise<void> {
    if (ratings.length === 0) return;

    await this.databaseService.transaction(async (client) => {
      for (const rating of ratings) {
        const computedAtStr = rating.computedAt.toISOString().split('T')[0];

        await client.query(
          `INSERT INTO industry_group_rs_ratings
             (id, symbol, industry_group, rs_rating, weighted_score, group_size, computed_at, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (symbol, computed_at) DO UPDATE SET
             industry_group = EXCLUDED.industry_group,
             rs_rating = EXCLUDED.rs_rating,
             weighted_score = EXCLUDED.weighted_score,
             group_size = EXCLUDED.group_size`,
          [
            rating.symbol,
            rating.industryGroup,
            rating.rsRating,
            rating.weightedScore,
            rating.groupSize,
            computedAtStr,
          ],
        );
      }
    });
  }

  async getLatestRatings(symbols: string[]): Promise<IndustryGroupRsRating[]> {
    if (symbols.length === 0) return [];

    const placeholders = symbols.map((_, i) => `$${i + 1}`).join(', ');

    const result = (await this.databaseService.query(
      `SELECT id, symbol, industry_group, rs_rating, weighted_score, group_size, computed_at, created_at
       FROM industry_group_rs_ratings
       WHERE symbol IN (${placeholders})
         AND computed_at = (SELECT MAX(computed_at) FROM industry_group_rs_ratings)
       ORDER BY rs_rating DESC`,
      symbols,
    )) as { rows: IndustryGroupRsRatingRow[] };

    return result.rows.map((row) => this.toDomain(row));
  }

  async getLatestRating(symbol: string): Promise<IndustryGroupRsRating | null> {
    const results = await this.getLatestRatings([symbol]);
    return results.length > 0 ? results[0] : null;
  }

  private toDomain(row: IndustryGroupRsRatingRow): IndustryGroupRsRating {
    return IndustryGroupRsRating.of({
      symbol: row.symbol,
      industryGroup: row.industry_group,
      rsRating: row.rs_rating,
      weightedScore: parseFloat(row.weighted_score),
      groupSize: row.group_size,
      computedAt: new Date(row.computed_at),
    });
  }
}
