import { apiClient } from "../../global/api/api-instance";

export interface CompanyProfileDto {
  symbol: string;
  sector: string;
  industry: string;
}

export interface GetCompanyProfileResponse {
  profile: CompanyProfileDto;
}

export class MarketDataProfileClient {
  async getCompanyProfile(
    symbol: string,
  ): Promise<GetCompanyProfileResponse> {
    const response = await apiClient.get<GetCompanyProfileResponse>(
      `/market-data/profile`,
      {
        params: { symbol },
      },
    );
    return response.data;
  }
}
