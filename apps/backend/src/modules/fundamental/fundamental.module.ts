import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { FundamentalController } from './api/fundamental.controller';
import { FundamentalApiMapper } from './api/fundamental-api.mapper';
import { ComputeFinancialReportUseCase } from './use-cases/compute-financial-report.use-case';

@Module({
  imports: [MarketDataModule],
  controllers: [FundamentalController],
  providers: [FundamentalApiMapper, ComputeFinancialReportUseCase],
})
export class FundamentalModule {}
