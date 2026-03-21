import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { ThemesModule } from '../themes/themes.module';
import { NotificationModule } from '../notification/notification.module';
import { StockAnalysisController } from './api/stock-analysis.controller';
import { QueryConsolidationAnalysisAnalyzeUseCase } from './use-cases/query-consolidation-analysis-analyze-use.case';
import { RunConsolidationAnalysisUseCase } from './use-cases/run-consolidation-analysis.use-case';
import { QueryRsRatingsUseCase } from './use-cases/query-rs-ratings.use-case';
import { RunRsRatingsUseCase } from './use-cases/run-rs-ratings.use-case';
import { PythonConsolidationScreenerService } from './infrastructure/services/python-consolidation-screener.service';
import { ConsolidationAnalysisServiceImpl } from './infrastructure/services/consolidation-analysis.service';
import { ConsolidationCronService } from './infrastructure/services/consolidation-cron.service';
import { ConsolidationResultRepositoryImpl } from './infrastructure/repositories/consolidation-result.repository';
import { RsRatingRepositoryImpl } from './infrastructure/repositories/rs-rating.repository';
import { PythonRsRatingScreenerService } from './infrastructure/services/python-rs-rating-screener.service';
import { RsRatingComputationServiceImpl } from './infrastructure/services/rs-rating-computation.service';
import { RsRatingCronService } from './infrastructure/services/rs-rating-cron.service';
import {
  CONSOLIDATION_ANALYSIS_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_SCREENER_SERVICE,
  RS_RATING_REPOSITORY,
  RS_RATING_COMPUTATION_SERVICE,
  RS_RATING_SCREENER_SERVICE,
} from './constants/tokens';

export {
  CONSOLIDATION_SCREENER_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_ANALYSIS_SERVICE,
  RS_RATING_REPOSITORY,
  RS_RATING_COMPUTATION_SERVICE,
  RS_RATING_SCREENER_SERVICE,
};

@Module({
  imports: [DatabaseModule, ThemesModule, NotificationModule],
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
    {
      provide: RS_RATING_REPOSITORY,
      useClass: RsRatingRepositoryImpl,
    },
    {
      provide: RS_RATING_SCREENER_SERVICE,
      useClass: PythonRsRatingScreenerService,
    },
    {
      provide: RS_RATING_COMPUTATION_SERVICE,
      useClass: RsRatingComputationServiceImpl,
    },
    ConsolidationCronService,
    RsRatingCronService,
    QueryConsolidationAnalysisAnalyzeUseCase,
    RunConsolidationAnalysisUseCase,
    QueryRsRatingsUseCase,
    RunRsRatingsUseCase,
  ],
  exports: [CONSOLIDATION_SCREENER_SERVICE, RS_RATING_REPOSITORY],
})
export class StockAnalysisModule {}
