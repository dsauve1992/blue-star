import { Module } from '@nestjs/common';
import { FundamentalController } from './api/fundamental.controller';
import { FundamentalApiMapper } from './api/fundamental-api.mapper';
import { ComputeFinancialReportUseCase } from './use-cases/compute-financial-report.use-case';
import { SecEdgarFundamentalService } from './infrastructure/services/sec-edgar-fundamental.service';
import { FUNDAMENTAL_SERVICE } from './constants/tokens';

@Module({
  controllers: [FundamentalController],
  providers: [
    FundamentalApiMapper,
    ComputeFinancialReportUseCase,
    { provide: FUNDAMENTAL_SERVICE, useClass: SecEdgarFundamentalService },
  ],
})
export class FundamentalModule {}
