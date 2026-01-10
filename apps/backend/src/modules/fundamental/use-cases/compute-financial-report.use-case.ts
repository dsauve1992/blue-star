import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../../market-data/domain/value-objects/symbol';
import { IncomeStatement } from '../../market-data/domain/value-objects/income-statement';
import { FundamentalService } from '../../market-data/domain/services/fundamental.service';
import { FUNDAMENTAL_SERVICE } from '../../market-data/constants/tokens';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { QuarterlyGrowth } from '../domain/value-objects/quarterly-growth';

export interface ComputeFinancialReportRequestDto {
  symbol: Symbol;
}

export interface ComputeFinancialReportResponseDto {
  report: FinancialReport;
}

interface QuarterlyData {
  quarter: string;
  year: string;
  eps: number;
  revenue: number;
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
    const incomeStatements =
      await this.fundamentalService.getIncomeStatementHistory(request.symbol, {
        period: 'quarter',
        limit: 16,
      });

    const quarterlyData = this.extractQuarterlyData(incomeStatements);
    const quarterlyGrowths = this.calculateYearOverYearGrowth(quarterlyData);
    const last8Quarters = quarterlyGrowths.slice(0, 8);

    const report = FinancialReport.of({
      symbol: request.symbol.value,
      quarterlyGrowths: last8Quarters,
    });

    return { report };
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

      const revenueGrowthPercent = previous
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

  private calculateGrowthPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return (current / previous - 1) * 100;
  }
}
