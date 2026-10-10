export class AnnualGrowth {
  private constructor(
    public readonly year: string,
    public readonly eps: number,
    public readonly epsGrowthPercent: number | null,
    public readonly returnOnEquityPercent: number | null,
  ) {}

  static of(data: {
    year: string;
    eps: number;
    epsGrowthPercent: number | null;
    returnOnEquityPercent: number | null;
  }): AnnualGrowth {
    return new AnnualGrowth(
      data.year,
      data.eps,
      data.epsGrowthPercent,
      data.returnOnEquityPercent,
    );
  }
}
