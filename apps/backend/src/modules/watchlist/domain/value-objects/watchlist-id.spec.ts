import { WatchlistId } from './watchlist-id';
import { InvariantError } from '../domain-errors';

describe('WatchlistId', () => {
  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['a number', 123 as unknown as string],
    ['an array', ['a'] as unknown as string],
    ['an object', { trim: () => 'x' } as unknown as string],
    ['null', null as unknown as string],
    [
      'an object with a non-callable toString',
      { toString: 1 } as unknown as string,
    ],
  ])('should reject %s', (_label, value) => {
    expect(() => WatchlistId.of(value)).toThrow(InvariantError);
  });

  it('should trim the value', () => {
    expect(WatchlistId.of('  abc  ').value).toBe('abc');
  });
});
