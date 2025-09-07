export class StopPrice {
  private constructor(public readonly value: number) {}
  static of(n: number): StopPrice {
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`Stop must be > 0: ${n}`);
    }
    return new StopPrice(n);
  }
}
