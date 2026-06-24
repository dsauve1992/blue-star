export type IndustryGroupQuadrant =
  | 'Leading'
  | 'Weakening'
  | 'Lagging'
  | 'Improving';

export class GapContext {
  private constructor(
    public readonly industryGroup: string | null,
    public readonly globalRsRating: number | null,
    public readonly industryGroupRsRating: number | null,
    public readonly industryGroupQuadrant: IndustryGroupQuadrant | null,
  ) {}

  static of(data: {
    industryGroup: string | null;
    globalRsRating: number | null;
    industryGroupRsRating: number | null;
    industryGroupQuadrant: IndustryGroupQuadrant | null;
  }): GapContext {
    return new GapContext(
      data.industryGroup,
      data.globalRsRating,
      data.industryGroupRsRating,
      data.industryGroupQuadrant,
    );
  }

  static none(): GapContext {
    return new GapContext(null, null, null, null);
  }
}
