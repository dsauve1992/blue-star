export type EstimatePeriod = '0q' | '+1q' | '0y' | '+1y';

export class EstimateTrend {
  private constructor(
    public readonly period: EstimatePeriod,
    public readonly endDate: string | null,
    public readonly analystCount: number | null,
    public readonly epsEstimate: number | null,
    public readonly epsEstimate30DaysAgo: number | null,
    public readonly epsEstimate90DaysAgo: number | null,
    public readonly upRevisionsLast30Days: number | null,
    public readonly downRevisionsLast30Days: number | null,
    public readonly revenueEstimate: number | null,
    public readonly revenueGrowthPercent: number | null,
  ) {}

  static of(data: {
    period: EstimatePeriod;
    endDate: string | null;
    analystCount: number | null;
    epsEstimate: number | null;
    epsEstimate30DaysAgo: number | null;
    epsEstimate90DaysAgo: number | null;
    upRevisionsLast30Days: number | null;
    downRevisionsLast30Days: number | null;
    revenueEstimate: number | null;
    revenueGrowthPercent: number | null;
  }): EstimateTrend {
    return new EstimateTrend(
      data.period,
      data.endDate,
      data.analystCount,
      data.epsEstimate,
      data.epsEstimate30DaysAgo,
      data.epsEstimate90DaysAgo,
      data.upRevisionsLast30Days,
      data.downRevisionsLast30Days,
      data.revenueEstimate,
      data.revenueGrowthPercent,
    );
  }

  get epsRevision30DaysPercent(): number | null {
    return this.revisionPercentSince(this.epsEstimate30DaysAgo);
  }

  get epsRevision90DaysPercent(): number | null {
    return this.revisionPercentSince(this.epsEstimate90DaysAgo);
  }

  private revisionPercentSince(pastEstimate: number | null): number | null {
    if (this.epsEstimate === null || pastEstimate === null) return null;
    if (pastEstimate === 0) return null;
    return ((this.epsEstimate - pastEstimate) / Math.abs(pastEstimate)) * 100;
  }
}
