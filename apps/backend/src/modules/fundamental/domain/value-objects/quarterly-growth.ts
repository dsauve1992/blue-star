export class QuarterlyGrowth {
  private constructor(
    public readonly quarter: string,
    public readonly year: string,
    public readonly eps: number,
    public readonly revenue: number,
    public readonly epsGrowthPercent: number | null,
    public readonly revenueGrowthPercent: number | null,
  ) {}

  static of(data: {
    quarter: string;
    year: string;
    eps: number;
    revenue: number;
    epsGrowthPercent: number | null;
    revenueGrowthPercent: number | null;
  }): QuarterlyGrowth {
    return new QuarterlyGrowth(
      data.quarter,
      data.year,
      data.eps,
      data.revenue,
      data.epsGrowthPercent,
      data.revenueGrowthPercent,
    );
  }
}
