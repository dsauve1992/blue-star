import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { NotificationModule } from '../notification/notification.module';
import { LeaderScanController } from './api/leader-scan.controller';
import { LeaderScanRepositoryImpl } from './infrastructure/repositories/leader-scan.repository';
import { PythonLeaderScanScreenerService } from './infrastructure/services/python-leader-scan-screener.service';
import { LeaderScanAnalysisServiceImpl } from './infrastructure/services/leader-scan-analysis.service';
import { LeaderScanCronService } from './infrastructure/services/leader-scan-cron.service';
import { RunLeaderScanUseCase } from './use-cases/run-leader-scan.use-case';
import { QueryLatestLeadersUseCase } from './use-cases/query-latest-leaders.use-case';
import { QueryLeaderBySymbolUseCase } from './use-cases/query-leader-by-symbol.use-case';
import {
  LEADER_SCAN_ANALYSIS_SERVICE,
  LEADER_SCAN_REPOSITORY,
  LEADER_SCAN_SCREENER_SERVICE,
} from './constants/tokens';

export {
  LEADER_SCAN_ANALYSIS_SERVICE,
  LEADER_SCAN_REPOSITORY,
  LEADER_SCAN_SCREENER_SERVICE,
};

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [LeaderScanController],
  providers: [
    { provide: LEADER_SCAN_REPOSITORY, useClass: LeaderScanRepositoryImpl },
    {
      provide: LEADER_SCAN_SCREENER_SERVICE,
      useClass: PythonLeaderScanScreenerService,
    },
    {
      provide: LEADER_SCAN_ANALYSIS_SERVICE,
      useClass: LeaderScanAnalysisServiceImpl,
    },
    LeaderScanCronService,
    RunLeaderScanUseCase,
    QueryLatestLeadersUseCase,
    QueryLeaderBySymbolUseCase,
  ],
  exports: [LEADER_SCAN_REPOSITORY],
})
export class LeaderScanModule {}
