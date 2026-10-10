import { Injectable } from '@nestjs/common';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { QuarterlyGrowth } from '../domain/value-objects/quarterly-growth';
import { AnnualGrowth } from '../domain/value-objects/annual-growth';
import {
  AnnualGrowthApiDto,
  FinancialReportApiDto,
  QuarterlyGrowthApiDto,
  ComputeFinancialReportApiResponseDto,
  RateFinancialsWithAiApiResponseDto,
} from './fundamental-api.dto';
import { ComputeFinancialReportResponseDto } from '../use-cases/compute-financial-report.use-case';
import { RateFinancialsWithAiResponseDto } from '../use-cases/rate-financials-with-ai.use-case';

@Injectable()
export class FundamentalApiMapper {
  mapQuarterlyGrowthToApiDto(
    quarterlyGrowth: QuarterlyGrowth,
  ): QuarterlyGrowthApiDto {
    return {
      quarter: quarterlyGrowth.quarter,
      year: quarterlyGrowth.year,
      eps: quarterlyGrowth.eps,
      revenue: quarterlyGrowth.revenue,
      epsGrowthPercent: quarterlyGrowth.epsGrowthPercent,
      revenueGrowthPercent: quarterlyGrowth.revenueGrowthPercent,
    };
  }

  mapAnnualGrowthToApiDto(annualGrowth: AnnualGrowth): AnnualGrowthApiDto {
    return {
      year: annualGrowth.year,
      eps: annualGrowth.eps,
      epsGrowthPercent: annualGrowth.epsGrowthPercent,
      returnOnEquityPercent: annualGrowth.returnOnEquityPercent,
    };
  }

  mapFinancialReportToApiDto(report: FinancialReport): FinancialReportApiDto {
    return {
      symbol: report.symbol,
      quarterlyGrowths: report.quarterlyGrowths.map((qg) =>
        this.mapQuarterlyGrowthToApiDto(qg),
      ),
      annualGrowths: report.annualGrowths.map((ag) =>
        this.mapAnnualGrowthToApiDto(ag),
      ),
    };
  }

  mapComputeFinancialReportResponse(
    useCaseResponse: ComputeFinancialReportResponseDto,
  ): ComputeFinancialReportApiResponseDto {
    return {
      report: this.mapFinancialReportToApiDto(useCaseResponse.report),
      rating: {
        grade: useCaseResponse.rating.grade,
        scorePercent: useCaseResponse.rating.scorePercent,
        criteria: useCaseResponse.rating.criteria.map((c) => ({ ...c })),
      },
    };
  }

  mapRateFinancialsWithAiResponse({
    rating,
  }: RateFinancialsWithAiResponseDto): RateFinancialsWithAiApiResponseDto {
    return {
      rating: {
        model: rating.model,
        grade: rating.grade,
        gradeConfidence: rating.gradeConfidence,
        gradeProbabilities: { ...rating.gradeProbabilities },
        currentEarnings: { ...rating.currentEarnings },
        annualEarnings: { ...rating.annualEarnings },
      },
    };
  }
}
