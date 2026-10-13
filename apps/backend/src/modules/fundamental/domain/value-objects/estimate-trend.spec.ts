import { EstimateTrend } from './estimate-trend';

const trend = (
  epsEstimate: number | null,
  epsEstimate30DaysAgo: number | null,
  epsEstimate90DaysAgo: number | null,
) =>
  EstimateTrend.of({
    period: '0y',
    endDate: '2026-12-31',
    analystCount: 8,
    epsEstimate,
    epsEstimate30DaysAgo,
    epsEstimate90DaysAgo,
    upRevisionsLast30Days: 1,
    downRevisionsLast30Days: 0,
    revenueEstimate: null,
    revenueGrowthPercent: null,
  });

describe('EstimateTrend', () => {
  it('computes upward revisions against positive past estimates', () => {
    const subject = trend(2.2, 2, 1.1);

    expect(subject.epsRevision30DaysPercent).toBeCloseTo(10);
    expect(subject.epsRevision90DaysPercent).toBeCloseTo(100);
  });

  it('treats a shrinking expected loss as an upward revision', () => {
    expect(
      trend(-0.451, -0.49571, -0.56438).epsRevision90DaysPercent,
    ).toBeCloseTo(20.09, 1);
  });

  it('treats a widening expected loss as a downward revision', () => {
    expect(trend(-1.1, -1, -1).epsRevision30DaysPercent).toBeCloseTo(-10);
  });

  it('has no revision when an estimate is missing or the past estimate is zero', () => {
    expect(trend(null, 1, 1).epsRevision30DaysPercent).toBeNull();
    expect(trend(1, null, 1).epsRevision30DaysPercent).toBeNull();
    expect(trend(1, 1, 0).epsRevision90DaysPercent).toBeNull();
  });
});
