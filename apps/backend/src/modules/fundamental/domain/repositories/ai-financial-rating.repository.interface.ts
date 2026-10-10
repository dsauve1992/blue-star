import type { Symbol } from '../../../../shared/value-objects/symbol';
import type { AiFinancialRating } from '../services/ai-financial-rater';

export interface AiFinancialRatingRepository {
  findByFingerprint(
    symbol: Symbol,
    requestFingerprint: string,
  ): Promise<AiFinancialRating | null>;
  save(
    symbol: Symbol,
    requestFingerprint: string,
    rating: AiFinancialRating,
  ): Promise<void>;
}
