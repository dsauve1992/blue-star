export class WatchlistTicker {
  private constructor(public readonly value: string) {}

  static of(ticker: string): WatchlistTicker {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      throw new Error(`WatchlistTicker cannot be empty: ${ticker}`);
    }

    const trimmedTicker = ticker.trim().toUpperCase();

    if (trimmedTicker.length > 50) {
      throw new Error(
        `WatchlistTicker cannot exceed 50 characters: ${trimmedTicker.length}`,
      );
    }

    if (!/^[A-Z0-9.:-]+$/.test(trimmedTicker)) {
      throw new Error(`Invalid watchlist ticker format: ${ticker}`);
    }

    return new WatchlistTicker(trimmedTicker);
  }

  toString() {
    return this.value;
  }

  equals(other: WatchlistTicker): boolean {
    return this.value === other.value;
  }
}
