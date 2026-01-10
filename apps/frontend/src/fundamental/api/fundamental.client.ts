import { apiClient } from "../../global/api/api-instance";

export interface QuarterlyGrowthApiDto {
  quarter: string;
  year: string;
  eps: number;
  revenue: number;
  epsGrowthPercent: number | null;
  revenueGrowthPercent: number | null;
}

export interface FinancialReportApiDto {
  symbol: string;
  quarterlyGrowths: QuarterlyGrowthApiDto[];
}

export interface ComputeFinancialReportApiResponseDto {
  report: FinancialReportApiDto;
}

export class FundamentalClient {
  async getFinancialReport(
    symbol: string,
  ): Promise<ComputeFinancialReportApiResponseDto> {
    const response = await apiClient.get<ComputeFinancialReportApiResponseDto>(
      `/fundamental/financial-report`,
      {
        params: { symbol },
      },
    );
    return response.data;
  }
}
