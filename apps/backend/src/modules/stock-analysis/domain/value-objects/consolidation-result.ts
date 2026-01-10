export class ConsolidationResult {
  private constructor(
    public readonly symbol: string,
    public readonly isNew: boolean,
    public readonly tickerFullName: string,
    public readonly timeframe: 'daily' | 'weekly',
    public readonly themes: string[],
  ) {}

  static of(data: {
    symbol: string;
    isNew: boolean;
    tickerFullName: string;
    timeframe: 'daily' | 'weekly';
    themes?: string[];
  }): ConsolidationResult {
    return new ConsolidationResult(
      data.symbol,
      data.isNew,
      data.tickerFullName,
      data.timeframe,
      data.themes || [],
    );
  }
}
