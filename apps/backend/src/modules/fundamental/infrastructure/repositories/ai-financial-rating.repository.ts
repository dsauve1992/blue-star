import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import type { AiFinancialRatingRepository as IAiFinancialRatingRepository } from '../../domain/repositories/ai-financial-rating.repository.interface';
import type { AiFinancialRating } from '../../domain/services/ai-financial-rater';

interface DatabaseRow {
  rating: AiFinancialRating;
}

@Injectable()
export class AiFinancialRatingRepositoryImpl
  implements IAiFinancialRatingRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async findByFingerprint(
    symbol: Symbol,
    requestFingerprint: string,
  ): Promise<AiFinancialRating | null> {
    const result = await this.databaseService.query(
      `SELECT rating FROM ai_financial_ratings
       WHERE symbol = $1 AND request_fingerprint = $2`,
      [symbol.value, requestFingerprint],
    );
    if (result.rows.length === 0) return null;
    return (result.rows[0] as DatabaseRow).rating;
  }

  async save(
    symbol: Symbol,
    requestFingerprint: string,
    rating: AiFinancialRating,
  ): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO ai_financial_ratings (symbol, request_fingerprint, model, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (symbol, request_fingerprint) DO NOTHING`,
      [symbol.value, requestFingerprint, rating.model, JSON.stringify(rating)],
    );
  }
}
