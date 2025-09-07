export class Ticker {
  private static re = /^[A-Z][A-Z0-9.-]{0,15}$/;
  private constructor(public readonly value: string) {}

  static of(sym: string): Ticker {
    if (!this.re.test(sym)) throw new Error(`Invalid ticker: ${sym}`);
    return new Ticker(sym);
  }

  toString() {
    return this.value;
  }
}
