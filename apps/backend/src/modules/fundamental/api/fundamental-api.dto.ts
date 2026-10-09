export interface QuarterlyGrowthApiDto {
  quarter: string;
  year: string;
  eps: number;
  revenue: number | null;
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
