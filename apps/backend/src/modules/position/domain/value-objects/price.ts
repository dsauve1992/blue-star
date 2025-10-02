export class Price {
  private constructor(public readonly value: number) {}
  static of(n: number): Price {
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`Price must be > 0: ${n}`);
    }
    return new Price(n);
  }
}
