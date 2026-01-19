import { AnalysisDate } from '../value-objects/analysis-date';

export interface ConsolidationResultData {
  id: string;
  timeframe: 'daily' | 'weekly';
  analysisDate: AnalysisDate;
  symbol: string;
  isNew: boolean;
  tickerFullName: string;
  sector: string | null;
  industry: string | null;
  createdAt: Date;
}

export class ConsolidationResultEntity {
  private constructor(
    public readonly id: string,
    public readonly timeframe: 'daily' | 'weekly',
    public readonly analysisDate: AnalysisDate,
    public readonly symbol: string,
    public readonly isNew: boolean,
    public readonly tickerFullName: string,
    public readonly sector: string | null,
    public readonly industry: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
    symbol: string,
    isNew: boolean,
    tickerFullName: string,
    sector: string | null,
    industry: string | null,
  ): ConsolidationResultEntity {
    return new ConsolidationResultEntity(
      crypto.randomUUID(),
      timeframe,
      analysisDate,
      symbol,
      isNew,
      tickerFullName,
      sector,
      industry,
      new Date(),
    );
  }

  static fromData(data: ConsolidationResultData): ConsolidationResultEntity {
    return new ConsolidationResultEntity(
      data.id,
      data.timeframe,
      data.analysisDate,
      data.symbol,
      data.isNew,
      data.tickerFullName,
      data.sector,
      data.industry,
      data.createdAt,
    );
  }
}
