import {
  classifyAcceleration,
  rateCanslimFinancials,
} from './canslim-rating-calculator';
import { QuarterlyGrowth } from './value-objects/quarterly-growth';
import { AnnualGrowth } from './value-objects/annual-growth';

function quarter(
  quarterLabel: string,
  year: string,
  eps: number,
  epsGrowthPercent: number | null,
  revenueGrowthPercent: number | null = 30,
): QuarterlyGrowth {
  return QuarterlyGrowth.of({
    quarter: quarterLabel,
    year,
    eps,
    revenue: 1_000,
    epsGrowthPercent,
    revenueGrowthPercent,
  });
}

function year(
  label: string,
  eps: number,
  epsGrowthPercent: number | null,
  returnOnEquityPercent: number | null,
): AnnualGrowth {
  return AnnualGrowth.of({
    year: label,
    eps,
    epsGrowthPercent,
    returnOnEquityPercent,
  });
}

describe('classifyAcceleration', () => {
  it.each([
    [[20, 35, 30, 45], 'moderate'],
    [[20, 30, 45, 35], 'neutral'],
    [[60, 45, 35, 28], 'decelerating'],
    [[20, 28, 35, 50], 'strong'],
  ] as const)('classifies %j as %s', (growths, expected) => {
    expect(classifyAcceleration([...growths])).toBe(expected);
  });

  it('caps growth at 100% before comparing', () => {
    expect(classifyAcceleration([7200, 90, 95, 100])).not.toBe('decelerating');
  });
});

describe('rateCanslimFinancials', () => {
  const strongYears = [
    year('2025', 4, 40, 25),
    year('2024', 2.8, 35, 22),
    year('2023', 2, 30, 20),
  ];

  it('grades a strong accelerating grower A', () => {
    const quarters = [
      quarter('Q4', '2025', 1.5, 50),
      quarter('Q3', '2025', 1.3, 35),
      quarter('Q2', '2025', 1.2, 28),
      quarter('Q1', '2025', 1.1, 20),
      quarter('Q4', '2024', 1.0, 10),
    ];

    const rating = rateCanslimFinancials(quarters, strongYears);

    expect(rating.grade).toBe('A');
    expect(rating.criteria.every((c) => c.status === 'pass')).toBe(true);
  });

  it('gives a confirmed turnaround partial credit instead of a growth percentage', () => {
    const quarters = [
      quarter('Q4', '2025', 0.5, 200),
      quarter('Q3', '2025', 0.3, 160),
      quarter('Q2', '2025', -0.1, 50),
      quarter('Q1', '2025', -0.2, 20),
      quarter('Q4', '2024', -0.5, null),
    ];

    const rating = rateCanslimFinancials(quarters, strongYears);
    const byKey = Object.fromEntries(rating.criteria.map((c) => [c.key, c]));

    expect(byKey.quarterlyEps.status).toBe('partial');
    expect(byKey.epsAcceleration.status).toBe('unscored');
  });

  it('leaves quarterly criteria unscored when there are no quarterly filings', () => {
    const rating = rateCanslimFinancials([], strongYears);

    expect(
      rating.criteria.filter((c) => c.status === 'unscored').map((c) => c.key),
    ).toEqual(['quarterlyEps', 'quarterlyRevenue', 'epsAcceleration']);
    expect(rating.grade).toBeNull();
  });

  describe('annual EPS growth', () => {
    function annualEpsCriterion(years: AnnualGrowth[]) {
      return rateCanslimFinancials([], years).criteria.find(
        (c) => c.key === 'annualEps',
      );
    }

    it('counts growth from a negative prior year as a turnaround, not a pass', () => {
      const criterion = annualEpsCriterion([
        year('2025', 3, 50, 20),
        year('2024', 2, 40, 20),
        year('2023', 1, 200, 20),
        year('2022', -1, null, 20),
      ]);

      expect(criterion).toEqual({
        key: 'annualEps',
        label: 'Annual EPS growth ≥ 25% for 3 years',
        status: 'partial',
        points: 0.75,
        detail: '+200% → +40% → +50% (one miss, EPS at new high)',
      });
    });

    it('gives the higher partial credit when the one miss is followed by a new EPS high', () => {
      const criterion = annualEpsCriterion([
        year('2025', 3, 80, 20),
        year('2024', 1.7, -10, 20),
        year('2023', 1.9, 40, 20),
      ]);

      expect(criterion).toEqual({
        key: 'annualEps',
        label: 'Annual EPS growth ≥ 25% for 3 years',
        status: 'partial',
        points: 0.75,
        detail: '+40% → -10% → +80% (one miss, EPS at new high)',
      });
    });

    it('gives the lower partial credit when EPS ends below its prior peak', () => {
      const criterion = annualEpsCriterion([
        year('2025', 1.4, -20, 20),
        year('2024', 1.8, 40, 20),
        year('2023', 1.3, 60, 20),
      ]);

      expect(criterion).toEqual({
        key: 'annualEps',
        label: 'Annual EPS growth ≥ 25% for 3 years',
        status: 'partial',
        points: 0.5,
        detail: '+60% → +40% → -20% (one miss)',
      });
    });
  });

  it('prints capped growth values in the acceleration detail', () => {
    const quarters = [
      quarter('Q4', '2025', 1.5, 150),
      quarter('Q3', '2025', 1.3, 120),
      quarter('Q2', '2025', 1.2, 90),
      quarter('Q1', '2025', 1.1, 7200),
    ];

    const criterion = rateCanslimFinancials(quarters, []).criteria.find(
      (c) => c.key === 'epsAcceleration',
    );

    expect(criterion).toEqual({
      key: 'epsAcceleration',
      label: 'EPS growth accelerating',
      status: 'pass',
      points: 1,
      detail: 'Strong: +100% → +90% → +100% → +100%',
    });
  });
});
