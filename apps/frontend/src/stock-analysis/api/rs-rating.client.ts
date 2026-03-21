import { apiClient } from "../../global/api/api-instance";

export interface RsRatingDto {
  symbol: string;
  rsRating: number;
  weightedScore: number;
  computedAt: string;
}

export interface RsRatingsResponse {
  ratings: RsRatingDto[];
}

export class RsRatingClient {
  async getRsRatings(symbols: string[]): Promise<RsRatingsResponse> {
    if (symbols.length === 0) return { ratings: [] };

    const params = new URLSearchParams();
    params.append("symbols", symbols.join(","));

    const response = await apiClient.get<RsRatingsResponse>(
      `/stock-analysis/rs-ratings?${params.toString()}`,
    );
    return response.data;
  }
}
