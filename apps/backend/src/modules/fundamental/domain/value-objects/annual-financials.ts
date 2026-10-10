export interface ComparableEps {
  current: number;
  previous: number;
}

export class AnnualFinancials {
  private constructor(
    public readonly symbol: string,
    public readonly fiscalYear: string,
    public readonly eps: number,
    public readonly comparableEps: ComparableEps | null,
    public readonly netIncome: number | null,
    public readonly stockholdersEquity: number | null,
  ) {}

  static of(data: {
    symbol: string;
    fiscalYear: string;
    eps: number;
    comparableEps: ComparableEps | null;
    netIncome: number | null;
    stockholdersEquity: number | null;
  }): AnnualFinancials {
    return new AnnualFinancials(
      data.symbol,
      data.fiscalYear,
      data.eps,
      data.comparableEps,
      data.netIncome,
      data.stockholdersEquity,
    );
  }
}
