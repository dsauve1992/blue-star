import { apiClient } from "../../global/api/api-instance";

export interface QuarterlyGrowthApiDto {
  quarter: string;
  year: string;
  eps: number;
  revenue: number | null;
  epsGrowthPercent: number | null;
  revenueGrowthPercent: number | null;
}

export interface AnnualGrowthApiDto {
  year: string;
  eps: number;
  epsGrowthPercent: number | null;
  returnOnEquityPercent: number | null;
}

export interface FinancialReportApiDto {
  symbol: string;
  quarterlyGrowths: QuarterlyGrowthApiDto[];
  annualGrowths: AnnualGrowthApiDto[];
}

export interface ComputeFinancialReportApiResponseDto {
  report: FinancialReportApiDto;
}

export interface EarningsSurpriseApiDto {
  quarterEnd: string;
  epsActual: number;
  epsEstimate: number;
  surprisePercent: number | null;
}

export type EstimatePeriod = "0q" | "+1q" | "0y" | "+1y";

export interface EstimateTrendApiDto {
  period: EstimatePeriod;
  endDate: string | null;
  analystCount: number | null;
  epsEstimate: number | null;
  epsRevision30DaysPercent: number | null;
  epsRevision90DaysPercent: number | null;
  upRevisionsLast30Days: number | null;
  downRevisionsLast30Days: number | null;
  revenueEstimate: number | null;
  revenueGrowthPercent: number | null;
}

export interface EarningsExpectationsApiDto {
  symbol: string;
  surprises: EarningsSurpriseApiDto[];
  estimateTrends: EstimateTrendApiDto[];
}

export interface GetEarningsExpectationsApiResponseDto {
  expectations: EarningsExpectationsApiDto;
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

  async getEarningsExpectations(
    symbol: string,
  ): Promise<GetEarningsExpectationsApiResponseDto> {
    const response = await apiClient.get<GetEarningsExpectationsApiResponseDto>(
      `/fundamental/expectations`,
      {
        params: { symbol },
      },
    );
    return response.data;
  }
}
