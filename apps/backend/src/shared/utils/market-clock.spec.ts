import { getMarketDateKey } from './market-clock';

describe('market-clock', () => {
  it('should compute market date key in Toronto timezone', () => {
    const date = new Date('2025-02-15T03:00:00.000Z');
    expect(getMarketDateKey(date)).toBe('2025-02-14');
  });

  it('should keep a winter Friday evening on the Toronto calendar day', () => {
    const date = new Date('2026-11-06T19:30:00-05:00');
    expect(getMarketDateKey(date)).toBe('2026-11-06');
  });
});
