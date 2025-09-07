export class PortfolioId {
  private constructor(public readonly value: string) {}
  static of(id: string): PortfolioId {
    if (!id || id.trim().length === 0) {
      throw new Error(`PortfolioId cannot be empty: ${id}`);
    }
    return new PortfolioId(id.trim());
  }
  toString() {
    return this.value;
  }
}
