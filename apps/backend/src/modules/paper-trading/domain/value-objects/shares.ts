export class Shares {
  private constructor(public readonly value: number) {}

  static of(n: number): Shares {
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      throw new Error(`Shares must be a positive integer: ${n}`);
    }
    return new Shares(n);
  }
}
