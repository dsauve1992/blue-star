export class EarningsSurprise {
  private constructor(
    public readonly quarterEnd: string,
    public readonly epsActual: number,
    public readonly epsEstimate: number,
  ) {}

  static of(data: {
    quarterEnd: string;
    epsActual: number;
    epsEstimate: number;
  }): EarningsSurprise {
    return new EarningsSurprise(
      data.quarterEnd,
      data.epsActual,
      data.epsEstimate,
    );
  }

  get surprisePercent(): number | null {
    if (this.epsEstimate === 0) return null;
    return (
      ((this.epsActual - this.epsEstimate) / Math.abs(this.epsEstimate)) * 100
    );
  }
}
