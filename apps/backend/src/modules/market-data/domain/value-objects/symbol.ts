export class Symbol {
  private constructor(public readonly value: string) {}

  static of(symbol: string): Symbol {
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      throw new Error(`Symbol must be a non-empty string: ${symbol}`);
    }

    const trimmedSymbol = symbol.trim().toUpperCase();

    // Basic validation for stock symbols. Supports:
    //   - plain tickers (AAPL, SPY)
    //   - exchange prefixes (NYSE:CIEN)
    //   - Yahoo Finance indices and subindices, which use a leading caret
    //     (^GSPC, ^SP500-4530 for the GICS Semiconductors industry group)
    if (!/^\^?[A-Z0-9.:-]+$/.test(trimmedSymbol)) {
      throw new Error(`Invalid symbol format: ${symbol}`);
    }

    return new Symbol(trimmedSymbol);
  }

  equals(other: Symbol): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
