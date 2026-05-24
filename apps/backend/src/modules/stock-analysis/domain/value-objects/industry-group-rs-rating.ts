export class IndustryGroupRsRating {
  private constructor(
    public readonly symbol: string,
    public readonly industryGroup: string,
    public readonly rsRating: number,
    public readonly weightedScore: number,
    public readonly groupSize: number,
    public readonly computedAt: Date,
  ) {}

  static of(data: {
    symbol: string;
    industryGroup: string;
    rsRating: number;
    weightedScore: number;
    groupSize: number;
    computedAt: Date;
  }): IndustryGroupRsRating {
    return new IndustryGroupRsRating(
      data.symbol,
      data.industryGroup,
      data.rsRating,
      data.weightedScore,
      data.groupSize,
      data.computedAt,
    );
  }
}
