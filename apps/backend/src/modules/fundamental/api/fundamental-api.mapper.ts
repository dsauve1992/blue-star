import { Injectable } from '@nestjs/common';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { QuarterlyGrowth } from '../domain/value-objects/quarterly-growth';
import { AnnualGrowth } from '../domain/value-objects/annual-growth';
import {
  AnnualGrowthApiDto,
  FinancialReportApiDto,
  QuarterlyGrowthApiDto,
  ComputeFinancialReportApiResponseDto,
} from './fundamental-api.dto';
import { ComputeFinancialReportResponseDto } from '../use-cases/compute-financial-report.use-case';

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
}
