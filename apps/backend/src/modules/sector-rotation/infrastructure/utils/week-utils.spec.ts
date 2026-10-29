import { WeekUtils } from './week-utils';

describe('WeekUtils.getWeekKey', () => {
  it('uses the ISO week-year so late-December and early-January dates do not collide', () => {
    expect(WeekUtils.getWeekKey(new Date(2024, 0, 1))).toBe('2024-W01');
    expect(WeekUtils.getWeekKey(new Date(2024, 11, 30))).toBe('2025-W01');
  });

  it('keeps 2029-01-01 and 2029-12-31 in different weeks', () => {
    expect(WeekUtils.getWeekKey(new Date(2029, 0, 1))).not.toBe(
      WeekUtils.getWeekKey(new Date(2029, 11, 31)),
    );
  });

  it('keys a 53-week year and its following week', () => {
    expect(WeekUtils.getWeekKey(new Date(2026, 11, 28))).toBe('2026-W53');
    expect(WeekUtils.getWeekKey(new Date(2027, 0, 4))).toBe('2027-W01');
  });

  it('keeps consecutive year-boundary weeks distinct', () => {
    expect(WeekUtils.getWeekKey(new Date(2025, 11, 29))).toBe('2026-W01');
    expect(WeekUtils.getWeekKey(new Date(2024, 11, 30))).toBe('2025-W01');
  });
});
