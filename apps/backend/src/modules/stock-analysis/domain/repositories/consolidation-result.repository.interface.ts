import { ConsolidationResultEntity } from '../entities/consolidation-result';
import { ConsolidationRun } from '../entities/consolidation-run';
import { AnalysisDate } from '../value-objects/analysis-date';

export interface ConsolidationResultRepository {
  saveResults(
    run: ConsolidationRun,
    results: ConsolidationResultEntity[],
  ): Promise<void>;

  getLatestResults(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): Promise<ConsolidationResultEntity[]>;

  getLatestRun(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): Promise<ConsolidationRun | null>;

  saveRun(run: ConsolidationRun): Promise<void>;
}
