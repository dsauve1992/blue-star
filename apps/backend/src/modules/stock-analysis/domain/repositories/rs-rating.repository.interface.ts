import { RsRating } from '../value-objects/rs-rating';

export interface RsRatingRepository {
  saveRatings(ratings: RsRating[]): Promise<void>;
  getLatestRatings(symbols: string[]): Promise<RsRating[]>;
  getAllForLatestDate(): Promise<RsRating[]>;
}
