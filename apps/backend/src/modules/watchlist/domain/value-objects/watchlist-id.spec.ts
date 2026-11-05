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
    ['a non-UUID string', 'abc'],
    [
      'an object with a non-callable toString',
      { toString: 1 } as unknown as string,
    ],
  ])('should reject %s', (_label, value) => {
    expect(() => WatchlistId.of(value)).toThrow(InvariantError);
  });

  it.each([
    '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    '11111111-1111-1111-1111-111111111111',
  ])('should accept the UUID %s', (uuid) => {
    expect(WatchlistId.of(uuid).value).toBe(uuid);
  });

  it('should trim the value', () => {
    const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(WatchlistId.of(`  ${uuid}  `).value).toBe(uuid);
  });
});
