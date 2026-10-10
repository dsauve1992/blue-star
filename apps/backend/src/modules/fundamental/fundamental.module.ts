import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { FundamentalController } from './api/fundamental.controller';
import { FundamentalApiMapper } from './api/fundamental-api.mapper';
import { ComputeFinancialReportUseCase } from './use-cases/compute-financial-report.use-case';
import { SecEdgarFundamentalService } from './infrastructure/services/sec-edgar-fundamental.service';
import { JevFinancialRaterService } from './infrastructure/services/jev-financial-rater.service';
import { RateFinancialsWithAiUseCase } from './use-cases/rate-financials-with-ai.use-case';
import { AiFinancialRatingRepositoryImpl } from './infrastructure/repositories/ai-financial-rating.repository';
import {
  AI_FINANCIAL_RATER,
  AI_FINANCIAL_RATING_REPOSITORY,
  FUNDAMENTAL_SERVICE,
} from './constants/tokens';

@Module({
  imports: [DatabaseModule],
  controllers: [FundamentalController],
  providers: [
    FundamentalApiMapper,
    ComputeFinancialReportUseCase,
    RateFinancialsWithAiUseCase,
    { provide: FUNDAMENTAL_SERVICE, useClass: SecEdgarFundamentalService },
    { provide: AI_FINANCIAL_RATER, useClass: JevFinancialRaterService },
    {
      provide: AI_FINANCIAL_RATING_REPOSITORY,
      useClass: AiFinancialRatingRepositoryImpl,
    },
  ],
})
export class FundamentalModule {}
