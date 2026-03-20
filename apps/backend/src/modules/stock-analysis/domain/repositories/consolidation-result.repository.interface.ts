import { ConsolidationResultEntity } from '../entities/consolidation-result';
import { ConsolidationRun } from '../entities/consolidation-run';

export interface ConsolidationResultRepository {
  saveResults(
    run: ConsolidationRun,
    results: ConsolidationResultEntity[],
  ): Promise<void>;

  getLatestResults(
    timeframe: 'daily' | 'weekly',
  ): Promise<ConsolidationResultEntity[]>;

  getLatestRun(
    timeframe: 'daily' | 'weekly',
  ): Promise<ConsolidationRun | null>;

  saveRun(run: ConsolidationRun): Promise<void>;
}
