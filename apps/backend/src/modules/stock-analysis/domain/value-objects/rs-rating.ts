export class RsRating {
  private constructor(
    public readonly symbol: string,
    public readonly rsRating: number,
    public readonly weightedScore: number,
    public readonly computedAt: Date,
  ) {}

  static of(data: {
    symbol: string;
    rsRating: number;
    weightedScore: number;
    computedAt: Date;
  }): RsRating {
    return new RsRating(
      data.symbol,
      data.rsRating,
      data.weightedScore,
      data.computedAt,
    );
  }
}
