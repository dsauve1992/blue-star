import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { ThemesModule } from '../themes/themes.module';
import { NotificationModule } from '../notification/notification.module';
import { StockClassificationModule } from '../stock-classification/stock-classification.module';
import { StockAnalysisController } from './api/stock-analysis.controller';
import { QueryConsolidationAnalysisAnalyzeUseCase } from './use-cases/query-consolidation-analysis-analyze-use.case';
import { RunConsolidationAnalysisUseCase } from './use-cases/run-consolidation-analysis.use-case';
import { QueryRsRatingsUseCase } from './use-cases/query-rs-ratings.use-case';
import { RunRsRatingsUseCase } from './use-cases/run-rs-ratings.use-case';
import { RunIndustryGroupRsRatingsUseCase } from './use-cases/run-industry-group-rs-ratings.use-case';
import { PythonConsolidationScreenerService } from './infrastructure/services/python-consolidation-screener.service';
import { ConsolidationAnalysisServiceImpl } from './infrastructure/services/consolidation-analysis.service';
import { ConsolidationCronService } from './infrastructure/services/consolidation-cron.service';
import { ConsolidationResultRepositoryImpl } from './infrastructure/repositories/consolidation-result.repository';
import { RsRatingRepositoryImpl } from './infrastructure/repositories/rs-rating.repository';
import { IndustryGroupRsRatingRepositoryImpl } from './infrastructure/repositories/industry-group-rs-rating.repository';
import { PythonRsRatingScreenerService } from './infrastructure/services/python-rs-rating-screener.service';
import { RsRatingComputationServiceImpl } from './infrastructure/services/rs-rating-computation.service';
import { IndustryGroupRsRatingComputationServiceImpl } from './infrastructure/services/industry-group-rs-rating-computation.service';
import { RsRatingCronService } from './infrastructure/services/rs-rating-cron.service';
import {
  CONSOLIDATION_ANALYSIS_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_SCREENER_SERVICE,
  INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE,
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  RS_RATING_COMPUTATION_SERVICE,
  RS_RATING_REPOSITORY,
  RS_RATING_SCREENER_SERVICE,
} from './constants/tokens';

export {
  CONSOLIDATION_SCREENER_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_ANALYSIS_SERVICE,
  RS_RATING_REPOSITORY,
  RS_RATING_COMPUTATION_SERVICE,
  RS_RATING_SCREENER_SERVICE,
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE,
};

@Module({
  imports: [
    DatabaseModule,
    ThemesModule,
    NotificationModule,
    StockClassificationModule,
  ],
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
    {
      provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
      useClass: IndustryGroupRsRatingRepositoryImpl,
    },
    {
      provide: INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE,
      useClass: IndustryGroupRsRatingComputationServiceImpl,
    },
    ConsolidationCronService,
    RsRatingCronService,
    QueryConsolidationAnalysisAnalyzeUseCase,
    RunConsolidationAnalysisUseCase,
    QueryRsRatingsUseCase,
    RunRsRatingsUseCase,
    RunIndustryGroupRsRatingsUseCase,
  ],
  exports: [CONSOLIDATION_SCREENER_SERVICE, RS_RATING_REPOSITORY],
})
export class StockAnalysisModule {}
