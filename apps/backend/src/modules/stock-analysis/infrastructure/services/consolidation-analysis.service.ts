import { Inject, Injectable } from '@nestjs/common';
import { ConsolidationAnalysisService } from '../../domain/services/consolidation-analysis.service';
import { ConsolidationScreenerService } from '../../domain/services/consolidation-screener.service';
import { ConsolidationResultRepository } from '../../domain/repositories/consolidation-result.repository.interface';
import { ConsolidationRun } from '../../domain/entities/consolidation-run';
import { ConsolidationResultEntity } from '../../domain/entities/consolidation-result';
import { AnalysisDate } from '../../domain/value-objects/analysis-date';
import {
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_SCREENER_SERVICE,
} from '../../constants/tokens';

@Injectable()
export class ConsolidationAnalysisServiceImpl
  implements ConsolidationAnalysisService
{
  constructor(
    @Inject(CONSOLIDATION_SCREENER_SERVICE)
    private readonly screenerService: ConsolidationScreenerService,
    @Inject(CONSOLIDATION_RESULT_REPOSITORY)
    private readonly repository: ConsolidationResultRepository,
  ) {}

  async runAnalysis(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): Promise<ConsolidationRun> {
    const run = ConsolidationRun.create(timeframe, analysisDate);
    await this.repository.saveRun(run);

    try {
      const results = await this.screenerService.analyzeConsolidations({
        type: timeframe,
      });

      const entities: ConsolidationResultEntity[] = [];
      const relevantResults =
        timeframe === 'daily' ? results.daily : results.weekly;

      for (const result of relevantResults) {
        entities.push(
          ConsolidationResultEntity.create(
            timeframe,
            analysisDate,
            result.symbol,
            result.isNew,
          ),
        );
      }

      run.markCompleted();
      await this.repository.saveResults(run, entities);

      return run;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      run.markFailed(errorMessage);
      await this.repository.saveRun(run);
      throw error;
    }
  }
}
