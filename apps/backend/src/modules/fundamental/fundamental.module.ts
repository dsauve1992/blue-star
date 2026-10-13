import { Module } from '@nestjs/common';
import { FundamentalController } from './api/fundamental.controller';
import { FundamentalApiMapper } from './api/fundamental-api.mapper';
import { ComputeFinancialReportUseCase } from './use-cases/compute-financial-report.use-case';
import { GetEarningsExpectationsUseCase } from './use-cases/get-earnings-expectations.use-case';
import { SecEdgarFundamentalService } from './infrastructure/services/sec-edgar-fundamental.service';
import { YahooEarningsExpectationsService } from './infrastructure/services/yahoo-earnings-expectations.service';
import {
  EARNINGS_EXPECTATIONS_SERVICE,
  FUNDAMENTAL_SERVICE,
} from './constants/tokens';

@Module({
  controllers: [FundamentalController],
  providers: [
    FundamentalApiMapper,
    ComputeFinancialReportUseCase,
    GetEarningsExpectationsUseCase,
    { provide: FUNDAMENTAL_SERVICE, useClass: SecEdgarFundamentalService },
    {
      provide: EARNINGS_EXPECTATIONS_SERVICE,
      useClass: YahooEarningsExpectationsService,
    },
  ],
})
export class FundamentalModule {}
