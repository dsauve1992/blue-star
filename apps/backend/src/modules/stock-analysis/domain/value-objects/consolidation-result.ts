export class ConsolidationResult {
  private constructor(
    public readonly symbol: string,
    public readonly isNew: boolean,
    public readonly tickerFullName: string,
    public readonly timeframe: 'daily' | 'weekly',
  ) {}

  static of(data: {
    symbol: string;
    isNew: boolean;
    tickerFullName: string;
    timeframe: 'daily' | 'weekly';
  }): ConsolidationResult {
    return new ConsolidationResult(
      data.symbol,
      data.isNew,
      data.tickerFullName,
      data.timeframe,
    );
  }
}



