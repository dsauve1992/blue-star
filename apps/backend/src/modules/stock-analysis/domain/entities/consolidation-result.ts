import { AnalysisDate } from '../value-objects/analysis-date';

export interface ConsolidationResultData {
  id: string;
  timeframe: 'daily' | 'weekly';
  analysisDate: AnalysisDate;
  symbol: string;
  isNew: boolean;
  createdAt: Date;
}

export class ConsolidationResultEntity {
  private constructor(
    public readonly id: string,
    public readonly timeframe: 'daily' | 'weekly',
    public readonly analysisDate: AnalysisDate,
    public readonly symbol: string,
    public readonly isNew: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
    symbol: string,
    isNew: boolean,
  ): ConsolidationResultEntity {
    return new ConsolidationResultEntity(
      crypto.randomUUID(),
      timeframe,
      analysisDate,
      symbol,
      isNew,
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
      data.createdAt,
    );
  }
}

