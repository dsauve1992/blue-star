import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { MarketHealthModule } from '../market-health/market-health.module';
import { StockAnalysisModule } from '../stock-analysis/stock-analysis.module';
import { NotificationModule } from '../notification/notification.module';
import { MarketRegimeController } from './api/market-regime.controller';
import { MarketRegimeApiMapper } from './api/market-regime-api.mapper';
import { GetMarketRegimeUseCase } from './use-cases/get-market-regime.use-case';
import { LeaderBreadthRepositoryImpl } from './infrastructure/repositories/leader-breadth.repository';
import { MarketRegimeRepositoryImpl } from './infrastructure/repositories/market-regime.repository';
import { MarketRegimeCronService } from './infrastructure/services/market-regime-cron.service';
import {
  LEADER_BREADTH_REPOSITORY,
  MARKET_REGIME_REPOSITORY,
} from './constants/tokens';

@Module({
  imports: [
    DatabaseModule,
    MarketHealthModule,
    StockAnalysisModule,
    NotificationModule,
  ],
  controllers: [MarketRegimeController],
  providers: [
    {
      provide: LEADER_BREADTH_REPOSITORY,
      useClass: LeaderBreadthRepositoryImpl,
    },
    {
      provide: MARKET_REGIME_REPOSITORY,
      useClass: MarketRegimeRepositoryImpl,
    },
    MarketRegimeApiMapper,
    GetMarketRegimeUseCase,
    MarketRegimeCronService,
  ],
})
export class MarketRegimeModule {}
