import { QuarterlyGrowth } from './quarterly-growth';

export class FinancialReport {
  private constructor(
    public readonly symbol: string,
    public readonly quarterlyGrowths: QuarterlyGrowth[],
  ) {}

  static of(data: {
    symbol: string;
    quarterlyGrowths: QuarterlyGrowth[];
  }): FinancialReport {
    return new FinancialReport(data.symbol, data.quarterlyGrowths);
  }
}
