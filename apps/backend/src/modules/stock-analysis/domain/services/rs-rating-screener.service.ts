export interface RsRatingResult {
  symbol: string;
  rsRating: number;
  weightedScore: number;
}

export interface RsRatingScreenerService {
  fetchRsRatings(): Promise<RsRatingResult[]>;
}
