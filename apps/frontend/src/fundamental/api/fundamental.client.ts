import { apiClient } from "../../global/api/api-instance";

const AI_RATING_TIMEOUT_MS = 30_000;

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

export type CanslimGrade = "A" | "B" | "C" | "D" | "F";

export interface CanslimCriterionApiDto {
  key: string;
  label: string;
  status: "pass" | "partial" | "fail" | "unscored";
  points: number | null;
  detail: string;
}

export interface CanslimRatingApiDto {
  grade: CanslimGrade | null;
  scorePercent: number | null;
  criteria: CanslimCriterionApiDto[];
}

export interface ComputeFinancialReportApiResponseDto {
  report: FinancialReportApiDto;
  rating: CanslimRatingApiDto;
}

export interface AiDimensionScoreApiDto {
  scorePercent: number;
  confidence: number;
  label: string;
}

export interface AiFinancialRatingApiDto {
  model: string;
  grade: CanslimGrade;
  gradeConfidence: number;
  gradeProbabilities: Record<CanslimGrade, number>;
  currentEarnings: AiDimensionScoreApiDto;
  annualEarnings: AiDimensionScoreApiDto;
}

export interface RateFinancialsWithAiApiResponseDto {
  rating: AiFinancialRatingApiDto;
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

  async getAiFinancialRating(
    symbol: string,
  ): Promise<RateFinancialsWithAiApiResponseDto> {
    const response = await apiClient.get<RateFinancialsWithAiApiResponseDto>(
      `/fundamental/ai-rating`,
      {
        params: { symbol },
        timeout: AI_RATING_TIMEOUT_MS,
      },
    );
    return response.data;
  }
}
