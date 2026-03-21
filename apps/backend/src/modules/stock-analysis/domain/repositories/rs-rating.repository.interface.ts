import { RsRating } from '../value-objects/rs-rating';

export interface RsRatingRepository {
  saveRatings(ratings: RsRating[]): Promise<void>;
  getLatestRatings(symbols: string[]): Promise<RsRating[]>;
  getLatestRating(symbol: string): Promise<RsRating | null>;
}
