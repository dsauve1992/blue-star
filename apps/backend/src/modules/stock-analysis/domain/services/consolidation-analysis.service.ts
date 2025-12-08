import { ConsolidationRun } from '../entities/consolidation-run';
import { AnalysisDate } from '../value-objects/analysis-date';

export interface ConsolidationAnalysisService {
  runAnalysis(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): Promise<ConsolidationRun>;
}
