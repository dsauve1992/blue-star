import { WatchlistId } from './watchlist-id';
import { InvariantError } from '../domain-errors';

describe('WatchlistId', () => {
  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('should reject %s', (_label, value) => {
    expect(() => WatchlistId.of(value)).toThrow(InvariantError);
  });

  it('should trim the value', () => {
    expect(WatchlistId.of('  abc  ').value).toBe('abc');
  });
});
