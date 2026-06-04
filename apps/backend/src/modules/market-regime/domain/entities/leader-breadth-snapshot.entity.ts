export class LeaderBreadthSnapshot {
  private constructor(
    public readonly id: string,
    public readonly leaderCount: number,
    public readonly totalUniverse: number,
    public readonly rsThreshold: number,
    public readonly computedAt: Date,
  ) {}

  static create(params: {
    id: string;
    leaderCount: number;
    totalUniverse: number;
    rsThreshold: number;
    computedAt: Date;
  }): LeaderBreadthSnapshot {
    return new LeaderBreadthSnapshot(
      params.id,
      params.leaderCount,
      params.totalUniverse,
      params.rsThreshold,
      params.computedAt,
    );
  }
}
