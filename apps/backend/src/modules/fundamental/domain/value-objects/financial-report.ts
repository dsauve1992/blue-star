import { AnnualGrowth } from './annual-growth';
import { QuarterlyGrowth } from './quarterly-growth';

export class FinancialReport {
  private constructor(
    public readonly symbol: string,
    public readonly quarterlyGrowths: QuarterlyGrowth[],
    public readonly annualGrowths: AnnualGrowth[],
  ) {}

  static of(data: {
    symbol: string;
    quarterlyGrowths: QuarterlyGrowth[];
    annualGrowths: AnnualGrowth[];
  }): FinancialReport {
    return new FinancialReport(
      data.symbol,
      data.quarterlyGrowths,
      data.annualGrowths,
    );
  }
}
