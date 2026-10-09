import { WatchlistTicker } from './watchlist-ticker';
import { InvariantError } from '../domain-errors';

describe('WatchlistTicker', () => {
  it.each([
    ['empty', ''],
    ['undefined', undefined as unknown as string],
    ['51 characters', 'A'.repeat(51)],
    ['invalid character', 'AAPL!'],
    ['inner whitespace', 'BRK B'],
  ])('should reject %s', (_label, value) => {
    expect(() => WatchlistTicker.of(value)).toThrow(InvariantError);
  });

  it('should uppercase and expose the symbol without exchange prefix', () => {
    const ticker = WatchlistTicker.of('nasdaq:aapl');

    expect(ticker.value).toBe('NASDAQ:AAPL');
    expect(ticker.symbolOnly).toBe('AAPL');
  });

  it('should accept a dotted ticker', () => {
    expect(WatchlistTicker.of('BRK.B').value).toBe('BRK.B');
  });
});
