export class RotationMember {
  private constructor(
    public readonly name: string,
    public readonly symbol: string,
  ) {}

  static of(name: string, symbol: string): RotationMember {
    if (!name || name.trim().length === 0) {
      throw new Error('RotationMember name cannot be empty');
    }
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('RotationMember symbol cannot be empty');
    }
    return new RotationMember(name.trim(), symbol.trim().toUpperCase());
  }

  equals(other: RotationMember): boolean {
    return this.name === other.name && this.symbol === other.symbol;
  }

  toString(): string {
    return this.name;
  }
}
