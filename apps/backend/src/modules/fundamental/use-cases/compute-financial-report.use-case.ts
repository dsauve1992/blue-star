import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../../../shared/value-objects/symbol';
import { IncomeStatement } from '../domain/value-objects/income-statement';
import { AnnualFinancials } from '../domain/value-objects/annual-financials';
import { FundamentalService } from '../domain/services/fundamental.service';
import { FUNDAMENTAL_SERVICE } from '../constants/tokens';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { QuarterlyGrowth } from '../domain/value-objects/quarterly-growth';
import { AnnualGrowth } from '../domain/value-objects/annual-growth';
import { CanslimRating } from '../domain/value-objects/canslim-rating';
import { rateCanslimFinancials } from '../domain/canslim-rating-calculator';

export interface ComputeFinancialReportRequestDto {
  symbol: Symbol;
}

export interface ComputeFinancialReportResponseDto {
  report: FinancialReport;
  rating: CanslimRating;
}

interface QuarterlyData {
  quarter: string;
  year: string;
  eps: number;
  revenue: number | null;
}

@Injectable()
export class ComputeFinancialReportUseCase {
  constructor(
    @Inject(FUNDAMENTAL_SERVICE)
    private readonly fundamentalService: FundamentalService,
  ) {}

  async execute(
    request: ComputeFinancialReportRequestDto,
  ): Promise<ComputeFinancialReportResponseDto> {
    const [incomeStatements, annualFinancials] = await Promise.all([
      this.fundamentalService.getIncomeStatementHistory(request.symbol, {
        period: 'quarter',
        limit: 16,
      }),
      this.fundamentalService.getAnnualFinancialsHistory(request.symbol, {
        limit: 4,
      }),
    ]);

    const quarterlyData = this.extractQuarterlyData(incomeStatements);
    const quarterlyGrowths = this.calculateYearOverYearGrowth(quarterlyData);
    const last8Quarters = quarterlyGrowths.slice(0, 8);

    const report = FinancialReport.of({
      symbol: request.symbol.value,
      quarterlyGrowths: last8Quarters,
      annualGrowths: this.calculateAnnualGrowth(annualFinancials),
    });

    return {
      report,
      rating: rateCanslimFinancials(
        report.quarterlyGrowths,
        report.annualGrowths,
      ),
    };
  }

  private extractQuarterlyData(
    incomeStatements: IncomeStatement[],
  ): QuarterlyData[] {
    return incomeStatements
      .filter((statement) => {
        const period = statement.period.toUpperCase();
        return (
          period === 'Q1' ||
          period === 'Q2' ||
          period === 'Q3' ||
          period === 'Q4'
        );
      })
      .map((statement) => ({
        quarter: statement.period.toUpperCase(),
        year: statement.fiscalYear,
        eps: statement.eps,
        revenue: statement.revenue,
      }))
      .sort((a, b) => {
        const yearCompare = b.year.localeCompare(a.year);
        if (yearCompare !== 0) return yearCompare;
        const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
        return (
          quarterOrder[b.quarter as keyof typeof quarterOrder] -
          quarterOrder[a.quarter as keyof typeof quarterOrder]
        );
      });
  }

  private calculateYearOverYearGrowth(
    quarterlyData: QuarterlyData[],
  ): QuarterlyGrowth[] {
    const quarterlyMap = new Map<string, QuarterlyData>();

    for (const data of quarterlyData) {
      const key = `${data.quarter}-${data.year}`;
      quarterlyMap.set(key, data);
    }

    return quarterlyData.map((current) => {
      const previousYear = (parseInt(current.year) - 1).toString();
      const previousKey = `${current.quarter}-${previousYear}`;
      const previous = quarterlyMap.get(previousKey);

      const epsGrowthPercent = previous
        ? this.calculateGrowthPercent(current.eps, previous.eps)
        : null;

      const revenueGrowthPercent =
        current.revenue != null && previous?.revenue != null
          ? this.calculateGrowthPercent(current.revenue, previous.revenue)
          : null;

      return QuarterlyGrowth.of({
        quarter: current.quarter,
        year: current.year,
        eps: current.eps,
        revenue: current.revenue,
        epsGrowthPercent,
        revenueGrowthPercent,
      });
    });
  }

  private calculateAnnualGrowth(
    annualFinancials: AnnualFinancials[],
  ): AnnualGrowth[] {
    return [...annualFinancials]
      .sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear))
      .map((year) =>
        AnnualGrowth.of({
          year: year.fiscalYear,
          eps: year.eps,
          epsGrowthPercent: year.comparableEps
            ? this.calculateGrowthPercent(
                year.comparableEps.current,
                year.comparableEps.previous,
              )
            : null,
          returnOnEquityPercent: this.calculateReturnOnEquityPercent(year),
        }),
      );
  }

  private calculateReturnOnEquityPercent(
    year: AnnualFinancials,
  ): number | null {
    if (
      year.netIncome == null ||
      year.stockholdersEquity == null ||
      year.stockholdersEquity <= 0
    ) {
      return null;
    }
    return (year.netIncome / year.stockholdersEquity) * 100;
  }

  private calculateGrowthPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  }
}
