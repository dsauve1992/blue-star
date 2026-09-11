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
import { QueryIndustryGroupsUseCase } from './use-cases/query-industry-groups.use-case';
import { QueryIndustryGroupRatingsUseCase } from './use-cases/query-industry-group-ratings.use-case';
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
import { QueryMomentumLeadersUseCase } from './use-cases/query-momentum-leaders.use-case';
import { RunMomentumLeadersUseCase } from './use-cases/run-momentum-leaders.use-case';
import { MomentumLeaderRepositoryImpl } from './infrastructure/repositories/momentum-leader.repository';
import { PythonMomentumLeadersScreenerService } from './infrastructure/services/python-momentum-leaders-screener.service';
import { MomentumLeadersComputationServiceImpl } from './infrastructure/services/momentum-leaders-computation.service';
import { MomentumLeadersCronService } from './infrastructure/services/momentum-leaders-cron.service';
import {
  CONSOLIDATION_ANALYSIS_SERVICE,
  CONSOLIDATION_RESULT_REPOSITORY,
  CONSOLIDATION_SCREENER_SERVICE,
  INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE,
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  MOMENTUM_LEADER_REPOSITORY,
  MOMENTUM_LEADERS_COMPUTATION_SERVICE,
  MOMENTUM_LEADERS_SCREENER_SERVICE,
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
    {
      provide: MOMENTUM_LEADER_REPOSITORY,
      useClass: MomentumLeaderRepositoryImpl,
    },
    {
      provide: MOMENTUM_LEADERS_SCREENER_SERVICE,
      useClass: PythonMomentumLeadersScreenerService,
    },
    {
      provide: MOMENTUM_LEADERS_COMPUTATION_SERVICE,
      useClass: MomentumLeadersComputationServiceImpl,
    },
    ConsolidationCronService,
    RsRatingCronService,
    MomentumLeadersCronService,
    QueryConsolidationAnalysisAnalyzeUseCase,
    RunConsolidationAnalysisUseCase,
    QueryRsRatingsUseCase,
    RunRsRatingsUseCase,
    RunIndustryGroupRsRatingsUseCase,
    QueryIndustryGroupsUseCase,
    QueryIndustryGroupRatingsUseCase,
    QueryMomentumLeadersUseCase,
    RunMomentumLeadersUseCase,
  ],
  exports: [
    CONSOLIDATION_SCREENER_SERVICE,
    RS_RATING_REPOSITORY,
    INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  ],
})
export class StockAnalysisModule {}
