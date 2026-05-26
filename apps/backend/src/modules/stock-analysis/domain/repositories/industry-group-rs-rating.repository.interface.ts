import { IndustryGroupRsRating } from '../value-objects/industry-group-rs-rating';

export interface IndustryGroupSummary {
  industryGroup: string;
  memberCount: number;
  computedAt: Date;
}

export interface IndustryGroupRsRatingRepository {
  saveRatings(ratings: IndustryGroupRsRating[]): Promise<void>;
  getLatestRatings(symbols: string[]): Promise<IndustryGroupRsRating[]>;
  getLatestRating(symbol: string): Promise<IndustryGroupRsRating | null>;
  listLatestGroups(): Promise<IndustryGroupSummary[]>;
  getLatestRatingsByGroup(
    industryGroup: string,
  ): Promise<IndustryGroupRsRating[]>;
}
