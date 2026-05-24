export interface StockClassificationData {
  ticker: string;
  sector: string | null;
  industry: string | null;
  industryKey: string | null;
  industryGroup: string | null;
  classifiedAt: Date;
}

export class StockClassification {
  private constructor(
    public readonly ticker: string,
    public readonly sector: string | null,
    public readonly industry: string | null,
    public readonly industryKey: string | null,
    public readonly industryGroup: string | null,
    public readonly classifiedAt: Date,
  ) {}

  static create(params: {
    ticker: string;
    sector: string | null;
    industry: string | null;
    industryKey: string | null;
    industryGroup: string | null;
  }): StockClassification {
    return new StockClassification(
      params.ticker.toUpperCase(),
      params.sector,
      params.industry,
      params.industryKey,
      params.industryGroup,
      new Date(),
    );
  }

  static fromData(data: StockClassificationData): StockClassification {
    return new StockClassification(
      data.ticker,
      data.sector,
      data.industry,
      data.industryKey,
      data.industryGroup,
      data.classifiedAt,
    );
  }
}
