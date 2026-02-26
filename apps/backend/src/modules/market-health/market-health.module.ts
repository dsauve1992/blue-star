import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../config/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';
import { MarketHealthController } from './api/market-health.controller';
import { MarketHealthApiMapper } from './api/market-health-api.mapper';
import { GetMarketHealthUseCase } from './use-cases/get-market-health.use-case';
import { MarketHealthRepositoryImpl } from './infrastructure/repositories/market-health.repository';
import { MarketHealthCronService } from './infrastructure/services/market-health-cron.service';
import { MARKET_HEALTH_REPOSITORY } from './constants/tokens';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    MarketDataModule,
    NotificationModule,
  ],
  controllers: [MarketHealthController],
  providers: [
    {
      provide: MARKET_HEALTH_REPOSITORY,
      useClass: MarketHealthRepositoryImpl,
    },
    MarketHealthApiMapper,
    GetMarketHealthUseCase,
    MarketHealthCronService,
  ],
})
export class MarketHealthModule {}
