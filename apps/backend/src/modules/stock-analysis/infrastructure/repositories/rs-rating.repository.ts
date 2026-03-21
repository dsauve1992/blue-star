import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { RsRatingRepository } from '../../domain/repositories/rs-rating.repository.interface';
import { RsRating } from '../../domain/value-objects/rs-rating';

interface RsRatingRow {
  id: string;
  symbol: string;
  rs_rating: number;
  weighted_score: string;
  computed_at: string;
  created_at: string;
}

@Injectable()
export class RsRatingRepositoryImpl implements RsRatingRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async saveRatings(ratings: RsRating[]): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      for (const rating of ratings) {
        const computedAtStr = rating.computedAt.toISOString().split('T')[0];

        await client.query(
          `INSERT INTO rs_ratings (id, symbol, rs_rating, weighted_score, computed_at, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
           ON CONFLICT (symbol, computed_at) DO UPDATE SET
           rs_rating = EXCLUDED.rs_rating,
           weighted_score = EXCLUDED.weighted_score`,
          [rating.symbol, rating.rsRating, rating.weightedScore, computedAtStr],
        );
      }
    });
  }

  async getLatestRatings(symbols: string[]): Promise<RsRating[]> {
    if (symbols.length === 0) return [];

    const placeholders = symbols.map((_, i) => `$${i + 1}`).join(', ');

    const result = (await this.databaseService.query(
      `SELECT id, symbol, rs_rating, weighted_score, computed_at, created_at
       FROM rs_ratings
       WHERE symbol IN (${placeholders})
         AND computed_at = (SELECT MAX(computed_at) FROM rs_ratings)
       ORDER BY rs_rating DESC`,
      symbols,
    )) as { rows: RsRatingRow[] };

    return result.rows.map((row) =>
      RsRating.of({
        symbol: row.symbol,
        rsRating: row.rs_rating,
        weightedScore: parseFloat(row.weighted_score),
        computedAt: new Date(row.computed_at),
      }),
    );
  }

  async getLatestRating(symbol: string): Promise<RsRating | null> {
    const results = await this.getLatestRatings([symbol]);
    return results.length > 0 ? results[0] : null;
  }
}
