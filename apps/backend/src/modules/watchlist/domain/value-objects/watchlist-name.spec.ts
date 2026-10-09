import { WatchlistName } from './watchlist-name';
import { InvariantError } from '../domain-errors';

describe('WatchlistName', () => {
  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['undefined', undefined as unknown as string],
    ['256 characters', 'a'.repeat(256)],
  ])('should reject %s', (_label, value) => {
    expect(() => WatchlistName.of(value)).toThrow(InvariantError);
  });

  it('should trim a valid name', () => {
    expect(WatchlistName.of('  Growth  ').value).toBe('Growth');
  });

  it('should accept exactly 255 characters', () => {
    expect(WatchlistName.of('a'.repeat(255)).value).toHaveLength(255);
  });
});
