import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';
import { StockAnalysisModule } from '../stock-analysis/stock-analysis.module';
import { PotentScanController } from './api/potent-scan.controller';
import { PotentScanRepositoryImpl } from './infrastructure/repositories/potent-scan.repository';
import { PythonPotentScreenerService } from './infrastructure/services/python-potent-screener.service';
import { SpySessionCalendar } from './infrastructure/services/spy-session-calendar.service';
import { PotentScanCronService } from './infrastructure/services/potent-scan-cron.service';
import { RunPotentScanUseCase } from './use-cases/run-potent-scan.use-case';
import { GetPotentScanUseCase } from './use-cases/get-potent-scan.use-case';
import { ListPotentScanDatesUseCase } from './use-cases/list-potent-scan-dates.use-case';
import {
  POTENT_SCAN_REPOSITORY,
  POTENT_SCREENER_SERVICE,
  SESSION_CALENDAR,
} from './constants/tokens';

@Module({
  imports: [
    DatabaseModule,
    MarketDataModule,
    NotificationModule,
    StockAnalysisModule,
  ],
  controllers: [PotentScanController],
  providers: [
    { provide: POTENT_SCAN_REPOSITORY, useClass: PotentScanRepositoryImpl },
    { provide: POTENT_SCREENER_SERVICE, useClass: PythonPotentScreenerService },
    { provide: SESSION_CALENDAR, useClass: SpySessionCalendar },
    PotentScanCronService,
    RunPotentScanUseCase,
    GetPotentScanUseCase,
    ListPotentScanDatesUseCase,
  ],
})
export class PotentScanModule {}
