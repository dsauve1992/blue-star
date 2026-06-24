import {
  getMarketDateKey,
  getMarketOpenDateUtc,
  isDuringMarketHours,
  isWithinMarketHours,
  marketToday,
} from './market-time.util';

describe('market-time.util', () => {
  it('should resolve market open to 14:30 UTC during Toronto winter time', () => {
    const now = new Date('2025-02-14T15:00:00.000Z');
    const marketOpen = getMarketOpenDateUtc(now);
    expect(marketOpen.toISOString()).toBe('2025-02-14T14:30:00.000Z');
  });

  it('should resolve market open to 13:30 UTC during Toronto summer time', () => {
    const now = new Date('2025-06-16T14:00:00.000Z');
    const marketOpen = getMarketOpenDateUtc(now);
    expect(marketOpen.toISOString()).toBe('2025-06-16T13:30:00.000Z');
  });

  it('should compute market date key in Toronto timezone', () => {
    const date = new Date('2025-02-15T03:00:00.000Z');
    expect(getMarketDateKey(date)).toBe('2025-02-14');
  });

  it('should map a late-evening ET instant to the Toronto calendar day', () => {
    expect(marketToday(new Date('2026-06-25T03:00:00.000Z')).key).toBe(
      '2026-06-24',
    );
  });

  it('should treat two instants on the same Toronto day as the same market day', () => {
    const morning = marketToday(new Date('2026-06-24T13:30:00.000Z'));
    const afterClose = marketToday(new Date('2026-06-24T20:30:00.000Z'));
    expect(morning.equals(afterClose)).toBe(true);
  });

  it('should identify market hours boundaries using Toronto local time', () => {
    expect(isWithinMarketHours(new Date('2025-02-14T14:29:00.000Z'))).toBe(
      false,
    );
    expect(isWithinMarketHours(new Date('2025-02-14T14:30:00.000Z'))).toBe(
      true,
    );
    expect(isWithinMarketHours(new Date('2025-02-14T21:00:00.000Z'))).toBe(
      true,
    );
    expect(isWithinMarketHours(new Date('2025-02-14T21:01:00.000Z'))).toBe(
      false,
    );
  });

  it('should identify pre-market bars as outside market hours', () => {
    // 9:00 AM Toronto = 14:00 UTC in winter (before 9:30 open)
    expect(isDuringMarketHours(new Date('2025-02-14T14:00:00.000Z'))).toBe(
      false,
    );
  });

  it('should identify after-hours bars as outside market hours', () => {
    // 4:30 PM Toronto = 21:30 UTC in winter (after 4:00 close)
    expect(isDuringMarketHours(new Date('2025-02-14T21:30:00.000Z'))).toBe(
      false,
    );
  });
});
