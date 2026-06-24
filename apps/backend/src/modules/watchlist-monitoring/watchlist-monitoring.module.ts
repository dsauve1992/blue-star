import { Module } from '@nestjs/common';
import { WatchlistMonitoringController } from './api/watchlist-monitoring.controller';
import { WatchlistMonitoringApiMapper } from './api/watchlist-monitoring-api.mapper';
import { ActivateMonitoringUseCase } from './use-cases/activate-monitoring.use-case';
import { DeactivateMonitoringUseCase } from './use-cases/deactivate-monitoring.use-case';
import { GetMonitoringStatusUseCase } from './use-cases/get-monitoring-status.use-case';
import { WatchlistMonitoringWriteRepository } from './infrastructure/repositories/watchlist-monitoring-write.repository';
import { WatchlistMonitoringReadRepository } from './infrastructure/repositories/watchlist-monitoring-read.repository';
import { MonitoringAlertLogRepositoryImpl } from './infrastructure/repositories/monitoring-alert-log.repository';
import { BreakoutDetectionServiceImpl } from './infrastructure/services/breakout-detection.service';
import { GapDetectionServiceImpl } from './infrastructure/services/gap-detection.service';
import { GapContextServiceImpl } from './infrastructure/services/gap-context.service';
import { WatchlistMonitoringCronService } from './infrastructure/services/watchlist-monitoring-cron.service';
import {
  WATCHLIST_MONITORING_WRITE_REPOSITORY,
  WATCHLIST_MONITORING_READ_REPOSITORY,
  BREAKOUT_DETECTION_SERVICE,
  GAP_DETECTION_SERVICE,
  GAP_CONTEXT_SERVICE,
  MONITORING_ALERT_LOG_REPOSITORY,
} from './constants/tokens';
import { DatabaseModule } from '../../config/database.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';
import { StockClassificationModule } from '../stock-classification/stock-classification.module';
import { StockAnalysisModule } from '../stock-analysis/stock-analysis.module';
import { SectorRotationModule } from '../sector-rotation/sector-rotation.module';

@Module({
  imports: [
    DatabaseModule,
    WatchlistModule,
    MarketDataModule,
    NotificationModule,
    StockClassificationModule,
    StockAnalysisModule,
    SectorRotationModule,
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
    {
      provide: GAP_DETECTION_SERVICE,
      useClass: GapDetectionServiceImpl,
    },
    {
      provide: GAP_CONTEXT_SERVICE,
      useClass: GapContextServiceImpl,
    },
    {
      provide: MONITORING_ALERT_LOG_REPOSITORY,
      useClass: MonitoringAlertLogRepositoryImpl,
    },
    WatchlistMonitoringApiMapper,
    ActivateMonitoringUseCase,
    DeactivateMonitoringUseCase,
    GetMonitoringStatusUseCase,
    WatchlistMonitoringCronService,
  ],
})
export class WatchlistMonitoringModule {}
