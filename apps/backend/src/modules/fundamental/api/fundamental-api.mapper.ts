import { Injectable } from '@nestjs/common';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { QuarterlyGrowth } from '../domain/value-objects/quarterly-growth';
import { AnnualGrowth } from '../domain/value-objects/annual-growth';
import { EarningsSurprise } from '../domain/value-objects/earnings-surprise';
import { EstimateTrend } from '../domain/value-objects/estimate-trend';
import {
  AnnualGrowthApiDto,
  FinancialReportApiDto,
  QuarterlyGrowthApiDto,
  ComputeFinancialReportApiResponseDto,
  EarningsSurpriseApiDto,
  EstimateTrendApiDto,
  GetEarningsExpectationsApiResponseDto,
} from './fundamental-api.dto';
import { ComputeFinancialReportResponseDto } from '../use-cases/compute-financial-report.use-case';
import { GetEarningsExpectationsResponseDto } from '../use-cases/get-earnings-expectations.use-case';

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
    };
  }

  mapEarningsSurpriseToApiDto(
    surprise: EarningsSurprise,
  ): EarningsSurpriseApiDto {
    return {
      quarterEnd: surprise.quarterEnd,
      epsActual: surprise.epsActual,
      epsEstimate: surprise.epsEstimate,
      surprisePercent: surprise.surprisePercent,
    };
  }

  mapEstimateTrendToApiDto(trend: EstimateTrend): EstimateTrendApiDto {
    return {
      period: trend.period,
      endDate: trend.endDate,
      analystCount: trend.analystCount,
      epsEstimate: trend.epsEstimate,
      epsRevision30DaysPercent: trend.epsRevision30DaysPercent,
      epsRevision90DaysPercent: trend.epsRevision90DaysPercent,
      upRevisionsLast30Days: trend.upRevisionsLast30Days,
      downRevisionsLast30Days: trend.downRevisionsLast30Days,
      revenueEstimate: trend.revenueEstimate,
      revenueGrowthPercent: trend.revenueGrowthPercent,
    };
  }

  mapGetEarningsExpectationsResponse(
    useCaseResponse: GetEarningsExpectationsResponseDto,
  ): GetEarningsExpectationsApiResponseDto {
    const { expectations } = useCaseResponse;
    return {
      expectations: {
        symbol: expectations.symbol,
        surprises: expectations.surprises.map((surprise) =>
          this.mapEarningsSurpriseToApiDto(surprise),
        ),
        estimateTrends: expectations.estimateTrends.map((trend) =>
          this.mapEstimateTrendToApiDto(trend),
        ),
      },
    };
  }
}
