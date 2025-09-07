export class Quantity {
  private constructor(public readonly value: number) {}
  static of(n: number): Quantity {
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      throw new Error(`Quantity must be positive integer: ${n}`);
    }
    return new Quantity(n);
  }
}
