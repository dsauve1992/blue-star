import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../config/database.module';
import { StockAnalysisController } from './api/stock-analysis.controller';
import { QueryConsolidationAnalysisAnalyzeUseCase } from './use-cases/query-consolidation-analysis-analyze-use.case';
import { RunConsolidationAnalysisUseCase } from './use-cases/run-consolidation-analysis.use-case';
import { PythonConsolidationScreenerService } from './infrastructure/services/python-consolidation-screener.service';
import { ConsolidationAnalysisServiceImpl } from './infrastructure/services/consolidation-analysis.service';
import { ConsolidationCronService } from './infrastructure/services/consolidation-cron.service';
import { ConsolidationResultRepositoryImpl } from './infrastructure/repositories/consolidation-result.repository';
import {
  CONSOLIDATION_ANALYSIS_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_SCREENER_SERVICE,
} from './constants/tokens';

export {
  CONSOLIDATION_SCREENER_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_ANALYSIS_SERVICE,
};

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule],
  controllers: [StockAnalysisController],
  providers: [
    {
      provide: CONSOLIDATION_SCREENER_SERVICE,
      useClass: PythonConsolidationScreenerService,
    },
    {
      provide: CONSOLIDATION_RESULT_REPOSITORY,
      useClass: ConsolidationResultRepositoryImpl,
    },
    {
      provide: CONSOLIDATION_ANALYSIS_SERVICE,
      useClass: ConsolidationAnalysisServiceImpl,
    },
    ConsolidationCronService,
    QueryConsolidationAnalysisAnalyzeUseCase,
    RunConsolidationAnalysisUseCase,
  ],
  exports: [CONSOLIDATION_SCREENER_SERVICE],
})
export class StockAnalysisModule {}
