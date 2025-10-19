export class Symbol {
  private constructor(public readonly value: string) {}

  static of(symbol: string): Symbol {
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      throw new Error(`Symbol must be a non-empty string: ${symbol}`);
    }

    const trimmedSymbol = symbol.trim().toUpperCase();

    // Basic validation for stock symbols (can be extended)
    if (!/^[A-Z0-9.-]+$/.test(trimmedSymbol)) {
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
