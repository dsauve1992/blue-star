import {
  getMarketDateKey,
  getMarketOpenDateUtc,
  isWithinMarketHours,
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
});
