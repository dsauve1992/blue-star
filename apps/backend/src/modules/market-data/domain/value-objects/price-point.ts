export class PricePoint {
  private constructor(
    public readonly date: Date,
    public readonly open: number,
    public readonly high: number,
    public readonly low: number,
    public readonly close: number,
    public readonly volume: number,
  ) {}

  static of(
    date: Date,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): PricePoint {
    if (!date || !(date instanceof Date)) {
      throw new Error('Date must be a valid Date object');
    }

    if (!Number.isFinite(open) || open <= 0) {
      throw new Error(`Open price must be a positive number: ${open}`);
    }

    if (!Number.isFinite(high) || high <= 0) {
      throw new Error(`High price must be a positive number: ${high}`);
    }

    if (!Number.isFinite(low) || low <= 0) {
      throw new Error(`Low price must be a positive number: ${low}`);
    }

    if (!Number.isFinite(close) || close <= 0) {
      throw new Error(`Close price must be a positive number: ${close}`);
    }

    if (!Number.isFinite(volume) || volume < 0) {
      throw new Error(`Volume must be a non-negative number: ${volume}`);
    }

    // Validate OHLC relationships
    if (high < Math.max(open, close)) {
      throw new Error('High price must be >= max(open, close)');
    }

    if (low > Math.min(open, close)) {
      throw new Error('Low price must be <= min(open, close)');
    }

    return new PricePoint(date, open, high, low, close, volume);
  }

  getMidPrice(): number {
    return (this.high + this.low) / 2;
  }

  getPriceChange(): number {
    return this.close - this.open;
  }

  getPriceChangePercent(): number {
    return (this.getPriceChange() / this.open) * 100;
  }

  equals(other: PricePoint): boolean {
    return (
      this.date.getTime() === other.date.getTime() &&
      this.open === other.open &&
      this.high === other.high &&
      this.low === other.low &&
      this.close === other.close &&
      this.volume === other.volume
    );
  }
}
