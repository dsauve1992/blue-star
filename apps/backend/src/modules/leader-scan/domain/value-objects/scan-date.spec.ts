process.env.TZ = 'UTC';

import { ScanDate } from './scan-date';

describe('ScanDate', () => {
  describe('today', () => {
    it.each([
      ['Friday evening in winter', '2026-11-06T19:30:00-05:00', '2026-11-06'],
      ['Friday evening in summer', '2026-10-30T19:30:00-04:00', '2026-10-30'],
      ['early Saturday UTC', '2026-11-07T03:00:00Z', '2026-11-06'],
    ])('should use the Toronto date on %s', (_label, instant, expected) => {
      expect(ScanDate.today(new Date(instant)).toISOString()).toBe(expected);
    });
  });
});
