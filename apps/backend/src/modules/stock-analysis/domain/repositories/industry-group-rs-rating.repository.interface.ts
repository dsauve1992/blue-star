import { IndustryGroupRsRating } from '../value-objects/industry-group-rs-rating';

export interface IndustryGroupRsRatingRepository {
  saveRatings(ratings: IndustryGroupRsRating[]): Promise<void>;
  getLatestRatings(symbols: string[]): Promise<IndustryGroupRsRating[]>;
  getLatestRating(symbol: string): Promise<IndustryGroupRsRating | null>;
}
