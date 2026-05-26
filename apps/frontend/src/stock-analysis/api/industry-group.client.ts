import { apiClient } from "../../global/api/api-instance";

export interface IndustryGroupSummaryDto {
  industryGroup: string;
  memberCount: number;
  computedAt: string;
}

export interface IndustryGroupsResponse {
  groups: IndustryGroupSummaryDto[];
}

export interface IndustryGroupRatingDto {
  symbol: string;
  rsRating: number;
  weightedScore: number;
  groupSize: number;
}

export interface IndustryGroupRatingsResponse {
  industryGroup: string;
  computedAt: string;
  ratings: IndustryGroupRatingDto[];
}

export class IndustryGroupClient {
  async listIndustryGroups(): Promise<IndustryGroupsResponse> {
    const response = await apiClient.get<IndustryGroupsResponse>(
      "/stock-analysis/industry-groups",
    );
    return response.data;
  }

  async getIndustryGroupRatings(
    industryGroup: string,
  ): Promise<IndustryGroupRatingsResponse> {
    const response = await apiClient.get<IndustryGroupRatingsResponse>(
      `/stock-analysis/industry-groups/${encodeURIComponent(industryGroup)}/rs-ratings`,
    );
    return response.data;
  }
}
