import { computeMemberTiers } from './member-tier-calculator';
import { DailyBar } from './daily-bar-provider.service';
import { SessionDate } from '../value-objects/session-date';
import { classifyTier } from '../value-objects/member-tier';

const MEMBER_ID = 'member-1';

const sessions = (count: number): string[] =>
  Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
  );

const barsFromCloses = (closes: number[], range = 2): DailyBar[] => {
  const dates = sessions(closes.length);
  return closes.map((close, index) => ({
    date: SessionDate.of(dates[index]),
    high: close + range / 2,
    low: close - range / 2,
    close,
  }));
};

describe('classifyTier', () => {
  it.each([
    [3, 2, 1, 'Lead'],
    [1, 2, 3, 'Lag'],
    [2, 3, 1, 'Mediocre'],
    [3, 1, 2, 'Mediocre'],
    [2, 2, 1, 'Mediocre'],
    [1, 2, 2, 'Mediocre'],
  ])(
    'should classify EMA9=%d EMA21=%d EMA50=%d as %s',
    (ema9, ema21, ema50, tier) => {
      expect(classifyTier(ema9, ema21, ema50)).toBe(tier);
    },
  );
});

describe('computeMemberTiers', () => {
  it('should seed every EMA on the first close and smooth with 2/(period+1)', () => {
    const bars = barsFromCloses([10, 11, 12]);

    const tiers = computeMemberTiers(
      MEMBER_ID,
      bars,
      SessionDate.of('2026-01-01'),
      SessionDate.of('2026-01-03'),
    );

    expect(tiers.map((t) => [t.ema9, t.ema21, t.ema50])).toEqual([
      [10, 10, 10],
      [10.2, 10 + 1 / 11, 10 + 2 / 51],
      [
        10.2 + (12 - 10.2) * 0.2,
        10 + 1 / 11 + (12 - 10 - 1 / 11) * (2 / 22),
        10 + 2 / 51 + (12 - 10 - 2 / 51) * (2 / 51),
      ].map((value): unknown => expect.closeTo(value, 10)),
    ]);
    expect(tiers.map((t) => t.tier)).toEqual(['Mediocre', 'Lead', 'Lead']);
  });

  it('should emit one row per session between from and to, warmed up on the earlier bars', () => {
    const closes = Array.from({ length: 300 }, (_, index) => 100 + index);
    const bars = barsFromCloses(closes);
    const dates = sessions(300);

    const tiers = computeMemberTiers(
      MEMBER_ID,
      bars,
      SessionDate.of(dates[297]),
      SessionDate.of(dates[298]),
    );

    expect(tiers.map((t) => [t.memberId, t.date, t.close, t.tier])).toEqual([
      [MEMBER_ID, SessionDate.of(dates[297]), 397, 'Lead'],
      [MEMBER_ID, SessionDate.of(dates[298]), 398, 'Lead'],
    ]);
    expect(tiers[1].ema9).toBeCloseTo(398 - (9 - 1) / 2, 6);
    expect(tiers[1].ema21).toBeCloseTo(398 - (21 - 1) / 2, 6);
    expect(tiers[1].ema50).toBeCloseTo(398 - (50 - 1) / 2, 3);
  });

  it('should classify a falling series as Lag', () => {
    const closes = Array.from({ length: 120 }, (_, index) => 300 - index);
    const dates = sessions(120);

    const [last] = computeMemberTiers(
      MEMBER_ID,
      barsFromCloses(closes),
      SessionDate.of(dates[119]),
      SessionDate.of(dates[119]),
    );

    expect(last.tier).toBe('Lag');
  });

  it('should report the 14-session ADR as a % of the close, and none before 14 sessions', () => {
    const closes = Array.from({ length: 15 }, () => 50);
    const bars = barsFromCloses(closes, 2);
    bars[14] = { ...bars[14], high: 65, low: 51, close: 60 };
    const dates = sessions(15);

    const tiers = computeMemberTiers(
      MEMBER_ID,
      bars,
      SessionDate.of(dates[12]),
      SessionDate.of(dates[14]),
    );

    expect(tiers.map((t) => t.adrPct)).toEqual([
      null,
      (2 / 50) * 100,
      ((13 * 2 + 14) / 14 / 60) * 100,
    ]);
  });
});
