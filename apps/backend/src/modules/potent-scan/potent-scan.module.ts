import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';
import { StockAnalysisModule } from '../stock-analysis/stock-analysis.module';
import { PotentScanController } from './api/potent-scan.controller';
import { ClusterController } from './api/cluster.controller';
import { PotentScanRepositoryImpl } from './infrastructure/repositories/potent-scan.repository';
import { ClusterRepositoryImpl } from './infrastructure/repositories/cluster.repository';
import { MemberTierRepositoryImpl } from './infrastructure/repositories/member-tier.repository';
import { MarketDataDailyBarProvider } from './infrastructure/services/market-data-daily-bar-provider.service';
import { PythonPotentScreenerService } from './infrastructure/services/python-potent-screener.service';
import { SpySessionCalendar } from './infrastructure/services/spy-session-calendar.service';
import { PotentScanCronService } from './infrastructure/services/potent-scan-cron.service';
import { RunPotentScanUseCase } from './use-cases/run-potent-scan.use-case';
import { GetPotentScanUseCase } from './use-cases/get-potent-scan.use-case';
import { ListPotentScanDatesUseCase } from './use-cases/list-potent-scan-dates.use-case';
import { CreateClusterUseCase } from './use-cases/create-cluster.use-case';
import { ListClustersUseCase } from './use-cases/list-clusters.use-case';
import { GetClusterUseCase } from './use-cases/get-cluster.use-case';
import { AddClusterMemberUseCase } from './use-cases/add-cluster-member.use-case';
import { RemoveClusterMemberUseCase } from './use-cases/remove-cluster-member.use-case';
import { CloseClusterUseCase } from './use-cases/close-cluster.use-case';
import { UpdateClusterUseCase } from './use-cases/update-cluster.use-case';
import { TrackMemberTiersUseCase } from './use-cases/track-member-tiers.use-case';
import {
  CLUSTER_REPOSITORY,
  DAILY_BAR_PROVIDER,
  MEMBER_TIER_REPOSITORY,
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
  controllers: [PotentScanController, ClusterController],
  providers: [
    { provide: POTENT_SCAN_REPOSITORY, useClass: PotentScanRepositoryImpl },
    { provide: CLUSTER_REPOSITORY, useClass: ClusterRepositoryImpl },
    { provide: POTENT_SCREENER_SERVICE, useClass: PythonPotentScreenerService },
    { provide: SESSION_CALENDAR, useClass: SpySessionCalendar },
    { provide: MEMBER_TIER_REPOSITORY, useClass: MemberTierRepositoryImpl },
    { provide: DAILY_BAR_PROVIDER, useClass: MarketDataDailyBarProvider },
    PotentScanCronService,
    RunPotentScanUseCase,
    GetPotentScanUseCase,
    ListPotentScanDatesUseCase,
    CreateClusterUseCase,
    ListClustersUseCase,
    GetClusterUseCase,
    AddClusterMemberUseCase,
    RemoveClusterMemberUseCase,
    CloseClusterUseCase,
    UpdateClusterUseCase,
    TrackMemberTiersUseCase,
  ],
})
export class PotentScanModule {}
