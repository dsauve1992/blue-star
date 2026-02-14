import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WatchlistMonitoringController } from './api/watchlist-monitoring.controller';
import { WatchlistMonitoringApiMapper } from './api/watchlist-monitoring-api.mapper';
import { ActivateMonitoringUseCase } from './use-cases/activate-monitoring.use-case';
import { DeactivateMonitoringUseCase } from './use-cases/deactivate-monitoring.use-case';
import { GetMonitoringStatusUseCase } from './use-cases/get-monitoring-status.use-case';
import { WatchlistMonitoringWriteRepository } from './infrastructure/repositories/watchlist-monitoring-write.repository';
import { WatchlistMonitoringReadRepository } from './infrastructure/repositories/watchlist-monitoring-read.repository';
import { BreakoutDetectionServiceImpl } from './infrastructure/services/breakout-detection.service';
import { WatchlistMonitoringCronService } from './infrastructure/services/watchlist-monitoring-cron.service';
import {
  WATCHLIST_MONITORING_WRITE_REPOSITORY,
  WATCHLIST_MONITORING_READ_REPOSITORY,
  BREAKOUT_DETECTION_SERVICE,
} from './constants/tokens';
import { DatabaseModule } from '../../config/database.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    WatchlistModule,
    MarketDataModule,
    NotificationModule,
  ],
  controllers: [WatchlistMonitoringController],
  providers: [
    {
      provide: WATCHLIST_MONITORING_WRITE_REPOSITORY,
      useClass: WatchlistMonitoringWriteRepository,
    },
    {
      provide: WATCHLIST_MONITORING_READ_REPOSITORY,
      useClass: WatchlistMonitoringReadRepository,
    },
    {
      provide: BREAKOUT_DETECTION_SERVICE,
      useClass: BreakoutDetectionServiceImpl,
    },
    WatchlistMonitoringApiMapper,
    ActivateMonitoringUseCase,
    DeactivateMonitoringUseCase,
    GetMonitoringStatusUseCase,
    WatchlistMonitoringCronService,
  ],
})
export class WatchlistMonitoringModule {}
