export class MomentumLeader {
  private constructor(
    public readonly symbol: string,
    public readonly exchange: string,
    public readonly sector: string | null,
    public readonly perf1M: number,
    public readonly perf3M: number,
    public readonly perf6M: number,
    public readonly rank1M: number,
    public readonly rank3M: number,
    public readonly rank6M: number,
    public readonly rsScore: number,
    public readonly top1M: boolean,
    public readonly top3M: boolean,
    public readonly top6M: boolean,
    public readonly scanDate: Date,
    public readonly universeSize: number,
  ) {}

  static of(data: {
    symbol: string;
    exchange: string;
    sector: string | null;
    perf1M: number;
    perf3M: number;
    perf6M: number;
    rank1M: number;
    rank3M: number;
    rank6M: number;
    rsScore: number;
    top1M: boolean;
    top3M: boolean;
    top6M: boolean;
    scanDate: Date;
    universeSize: number;
  }): MomentumLeader {
    return new MomentumLeader(
      data.symbol,
      data.exchange,
      data.sector,
      data.perf1M,
      data.perf3M,
      data.perf6M,
      data.rank1M,
      data.rank3M,
      data.rank6M,
      data.rsScore,
      data.top1M,
      data.top3M,
      data.top6M,
      data.scanDate,
      data.universeSize,
    );
  }
}
