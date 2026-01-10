export class Sector {
  private constructor(
    public readonly symbol: string,
    public readonly name: string,
  ) {}

  static of(symbol: string, name: string): Sector {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('Sector symbol cannot be empty');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Sector name cannot be empty');
    }
    return new Sector(symbol.trim().toUpperCase(), name.trim());
  }

  equals(other: Sector): boolean {
    return this.symbol === other.symbol;
  }

  toString(): string {
    return `${this.symbol} (${this.name})`;
  }
}
