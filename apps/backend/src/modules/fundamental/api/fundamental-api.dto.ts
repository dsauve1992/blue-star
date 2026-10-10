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

export interface CanslimCriterionApiDto {
  key: string;
  label: string;
  status: 'pass' | 'partial' | 'fail' | 'unscored';
  points: number | null;
  detail: string;
}

export interface CanslimRatingApiDto {
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  scorePercent: number | null;
  criteria: CanslimCriterionApiDto[];
}

export interface ComputeFinancialReportApiResponseDto {
  report: FinancialReportApiDto;
  rating: CanslimRatingApiDto;
}

type CanslimGradeApiDto = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AiDimensionScoreApiDto {
  scorePercent: number;
  confidence: number;
  label: string;
}

export interface AiFinancialRatingApiDto {
  model: string;
  grade: CanslimGradeApiDto;
  gradeConfidence: number;
  gradeProbabilities: Record<CanslimGradeApiDto, number>;
  currentEarnings: AiDimensionScoreApiDto;
  annualEarnings: AiDimensionScoreApiDto;
}

export interface RateFinancialsWithAiApiResponseDto {
  rating: AiFinancialRatingApiDto;
}
