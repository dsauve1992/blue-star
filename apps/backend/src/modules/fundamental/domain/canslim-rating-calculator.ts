import { AnnualGrowth } from './value-objects/annual-growth';
import { QuarterlyGrowth } from './value-objects/quarterly-growth';
import {
  CanslimCriterion,
  CanslimGrade,
  CanslimRating,
} from './value-objects/canslim-rating';

const GROWTH_TARGET_PERCENT = 25;
const RETURN_ON_EQUITY_TARGET_PERCENT = 17;
const GROWTH_CAP_PERCENT = 100;
const ACCELERATION_SLACK_POINTS = 2;
const MODERATE_ACCELERATION_MIN_RISE_POINTS = 10;
const DECELERATION_MIN_DROP_POINTS = 15;
const MIN_SCORED_CRITERIA = 3;

const GRADE_THRESHOLDS: [number, CanslimGrade][] = [
  [0.85, 'A'],
  [0.7, 'B'],
  [0.5, 'C'],
  [0.3, 'D'],
];

export type AccelerationTrend =
  | 'strong'
  | 'moderate'
  | 'neutral'
  | 'decelerating';

export function classifyAcceleration(
  oldestToNewest: [number, number, number, number],
): AccelerationTrend {
  const [g1, g2, g3, g4] = oldestToNewest.map(capGrowth);
  if (
    g3 > g2 - ACCELERATION_SLACK_POINTS &&
    g4 > g3 - ACCELERATION_SLACK_POINTS &&
    g4 > g2
  ) {
    return 'strong';
  }
  if (g4 < g3 && g3 < g2 && g2 - g4 > DECELERATION_MIN_DROP_POINTS) {
    return 'decelerating';
  }
  if (
    g4 - g1 >= MODERATE_ACCELERATION_MIN_RISE_POINTS &&
    g4 >= g3 - ACCELERATION_SLACK_POINTS
  ) {
    return 'moderate';
  }
  return 'neutral';
}

export function rateCanslimFinancials(
  quarters: QuarterlyGrowth[],
  years: AnnualGrowth[],
): CanslimRating {
  const criteria = [
    rateLatestQuarterEps(quarters),
    rateLatestQuarterRevenue(quarters),
    rateEpsAcceleration(quarters),
    rateAnnualEpsGrowth(years),
    rateReturnOnEquity(years),
  ];

  const scored = criteria.filter((c) => c.points !== null);
  if (scored.length < MIN_SCORED_CRITERIA) {
    return CanslimRating.of({ grade: null, scorePercent: null, criteria });
  }

  const ratio =
    scored.reduce((sum, c) => sum + (c.points ?? 0), 0) / scored.length;
  const grade =
    GRADE_THRESHOLDS.find(([threshold]) => ratio >= threshold)?.[1] ?? 'F';

  return CanslimRating.of({
    grade,
    scorePercent: Math.round(ratio * 100),
    criteria,
  });
}

export function findPriorYearQuarter(
  quarters: QuarterlyGrowth[],
  quarter: QuarterlyGrowth,
): QuarterlyGrowth | undefined {
  const priorYear = (parseInt(quarter.year) - 1).toString();
  return quarters.find(
    (q) => q.quarter === quarter.quarter && q.year === priorYear,
  );
}

function rateLatestQuarterEps(quarters: QuarterlyGrowth[]): CanslimCriterion {
  const base = {
    key: 'quarterlyEps',
    label: 'Latest quarter EPS growth ≥ 25%',
  };
  const [latest, previous] = quarters;
  if (!latest || latest.epsGrowthPercent === null) {
    return unscored(base, 'No year-over-year EPS comparison');
  }

  const priorYear = findPriorYearQuarter(quarters, latest);
  if (priorYear && priorYear.eps <= 0) {
    const backToProfit =
      latest.eps > 0 && previous !== undefined && previous.eps > 0;
    return backToProfit
      ? {
          ...base,
          status: 'partial',
          points: 0.5,
          detail:
            'Turnaround: prior-year EPS was negative, last 2 quarters profitable',
        }
      : {
          ...base,
          status: 'fail',
          points: 0,
          detail: 'Turnaround not confirmed: prior-year EPS was negative',
        };
  }

  const growth = latest.epsGrowthPercent;
  return growth >= GROWTH_TARGET_PERCENT
    ? { ...base, status: 'pass', points: 1, detail: formatPercent(growth) }
    : { ...base, status: 'fail', points: 0, detail: formatPercent(growth) };
}

function rateLatestQuarterRevenue(
  quarters: QuarterlyGrowth[],
): CanslimCriterion {
  const base = {
    key: 'quarterlyRevenue',
    label: 'Revenue growth ≥ 25% or accelerating 3 quarters',
  };
  const [r0, r1, r2] = quarters.slice(0, 3).map((q) => q.revenueGrowthPercent);
  if (r0 === null || r0 === undefined) {
    return unscored(base, 'No year-over-year revenue comparison');
  }
  if (r0 >= GROWTH_TARGET_PERCENT) {
    return { ...base, status: 'pass', points: 1, detail: formatPercent(r0) };
  }
  const accelerating =
    r1 !== null &&
    r1 !== undefined &&
    r2 !== null &&
    r2 !== undefined &&
    r0 > r1 &&
    r1 > r2;
  return accelerating
    ? {
        ...base,
        status: 'pass',
        points: 1,
        detail: `Accelerating: ${formatSeries([r2, r1, r0])}`,
      }
    : { ...base, status: 'fail', points: 0, detail: formatPercent(r0) };
}

const ACCELERATION_POINTS: Record<AccelerationTrend, number> = {
  strong: 1,
  moderate: 0.75,
  neutral: 0.5,
  decelerating: 0,
};

function rateEpsAcceleration(quarters: QuarterlyGrowth[]): CanslimCriterion {
  const base = { key: 'epsAcceleration', label: 'EPS growth accelerating' };
  const latestFour = quarters.slice(0, 4);
  const growths = latestFour.map((q) => q.epsGrowthPercent);
  if (latestFour.length < 4 || growths.some((g) => g === null)) {
    return unscored(base, 'Fewer than 4 quarters of EPS growth');
  }
  const hasNegativeBase = latestFour.some((q) => {
    const priorYear = findPriorYearQuarter(quarters, q);
    return priorYear !== undefined && priorYear.eps <= 0;
  });
  if (hasNegativeBase) {
    return unscored(base, 'Growth chain broken by a negative prior-year EPS');
  }

  const oldestToNewest = [...(growths as number[])].reverse() as [
    number,
    number,
    number,
    number,
  ];
  const trend = classifyAcceleration(oldestToNewest);
  const points = ACCELERATION_POINTS[trend];
  return {
    ...base,
    status:
      trend === 'decelerating'
        ? 'fail'
        : trend === 'neutral'
          ? 'partial'
          : 'pass',
    points,
    detail: `${capitalize(trend)}: ${formatSeries(oldestToNewest.map(capGrowth))}`,
  };
}

function rateAnnualEpsGrowth(years: AnnualGrowth[]): CanslimCriterion {
  const base = {
    key: 'annualEps',
    label: 'Annual EPS growth ≥ 25% for 3 years',
  };
  const latestThree = years
    .slice(0, 3)
    .flatMap((y, index) =>
      y.epsGrowthPercent === null
        ? []
        : [{ growth: y.epsGrowthPercent, prior: years.at(index + 1) }],
    );
  if (latestThree.length < 2) {
    return unscored(base, 'Fewer than 2 years of comparable EPS');
  }

  const growths = latestThree.map((y) => y.growth);
  const detail = formatSeries([...growths].reverse());
  const misses = latestThree.filter(
    (y) =>
      (y.prior !== undefined && y.prior.eps <= 0) ||
      y.growth < GROWTH_TARGET_PERCENT,
  ).length;
  if (misses === 0) {
    return { ...base, status: 'pass', points: 1, detail };
  }
  if (misses === 1) {
    return isAtSplitSafeHigh([...growths].reverse())
      ? {
          ...base,
          status: 'partial',
          points: 0.75,
          detail: `${detail} (one miss, EPS at new high)`,
        }
      : {
          ...base,
          status: 'partial',
          points: 0.5,
          detail: `${detail} (one miss)`,
        };
  }
  return { ...base, status: 'fail', points: 0, detail };
}

function rateReturnOnEquity(years: AnnualGrowth[]): CanslimCriterion {
  const base = { key: 'returnOnEquity', label: 'Return on equity ≥ 17%' };
  const roe = years[0]?.returnOnEquityPercent ?? null;
  if (roe === null) {
    return unscored(base, 'ROE not available');
  }
  const detail = `${Math.round(roe * 10) / 10}%`;
  return roe >= RETURN_ON_EQUITY_TARGET_PERCENT
    ? { ...base, status: 'pass', points: 1, detail }
    : { ...base, status: 'fail', points: 0, detail };
}

function capGrowth(growth: number): number {
  return Math.min(growth, GROWTH_CAP_PERCENT);
}

function isAtSplitSafeHigh(oldestToNewestGrowths: number[]): boolean {
  let level = 1;
  let peak = level;
  for (const growth of oldestToNewestGrowths) {
    level *= 1 + growth / 100;
    peak = Math.max(peak, level);
  }
  return level >= peak;
}

function unscored(
  base: { key: string; label: string },
  detail: string,
): CanslimCriterion {
  return { ...base, status: 'unscored', points: null, detail };
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value)}%`;
}

function formatSeries(values: number[]): string {
  return values.map(formatPercent).join(' → ');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
