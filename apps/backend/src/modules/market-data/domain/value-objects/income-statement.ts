export class IncomeStatement {
  private constructor(
    public readonly symbol: string,
    public readonly fiscalYear: string,
    public readonly period: string,
    public readonly revenue: number,
    public readonly eps: number,
  ) {}

  static of(data: {
    symbol: string;
    fiscalYear: string;
    period: string;
    revenue: number;
    eps: number;
  }): IncomeStatement {
    return new IncomeStatement(
      data.symbol,
      data.fiscalYear,
      data.period,
      data.revenue,
      data.eps,
    );
  }
}
