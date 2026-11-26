import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../config/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';
import { StockAnalysisModule } from '../stock-analysis/stock-analysis.module';
import { PotentScanController } from './api/potent-scan.controller';
import { ClusterController } from './api/cluster.controller';
import { ProposalController } from './api/proposal.controller';
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
import { ResearchPotentHitsUseCase } from './use-cases/research-potent-hits.use-case';
import { HitResearchRepositoryImpl } from './infrastructure/repositories/hit-research.repository';
import { PythonHeadlineSource } from './infrastructure/services/python-headline-source.service';
import { AnthropicHitResearcher } from './infrastructure/services/anthropic-hit-researcher.service';
import { lazyAnthropicMessages } from './infrastructure/services/anthropic-messages.client';
import { TrackMemberTiersUseCase } from './use-cases/track-member-tiers.use-case';
import { ProposalRepositoryImpl } from './infrastructure/repositories/proposal.repository';
import { AnthropicClusterProposer } from './infrastructure/services/anthropic-cluster-proposer.service';
import { ProposeClustersUseCase } from './use-cases/propose-clusters.use-case';
import { GetProposalsUseCase } from './use-cases/get-proposals.use-case';
import { AcceptProposalUseCase } from './use-cases/accept-proposal.use-case';
import { RejectProposalUseCase } from './use-cases/reject-proposal.use-case';
import {
  ANTHROPIC_MESSAGES,
  HEADLINE_SOURCE,
  HIT_RESEARCH_REPOSITORY,
  HIT_RESEARCHER,
  CLUSTER_PROPOSER,
  CLUSTER_REPOSITORY,
  DAILY_BAR_PROVIDER,
  MEMBER_TIER_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
  POTENT_SCREENER_SERVICE,
  PROPOSAL_REPOSITORY,
  SESSION_CALENDAR,
} from './constants/tokens';

@Module({
  imports: [
    DatabaseModule,
    MarketDataModule,
    NotificationModule,
    StockAnalysisModule,
  ],
  controllers: [PotentScanController, ClusterController, ProposalController],
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
    { provide: HIT_RESEARCH_REPOSITORY, useClass: HitResearchRepositoryImpl },
    { provide: HEADLINE_SOURCE, useClass: PythonHeadlineSource },
    { provide: HIT_RESEARCHER, useClass: AnthropicHitResearcher },
    {
      provide: ANTHROPIC_MESSAGES,
      useFactory: lazyAnthropicMessages,
      inject: [ConfigService],
    },
    ResearchPotentHitsUseCase,
    TrackMemberTiersUseCase,
    { provide: PROPOSAL_REPOSITORY, useClass: ProposalRepositoryImpl },
    { provide: CLUSTER_PROPOSER, useClass: AnthropicClusterProposer },
    ProposeClustersUseCase,
    GetProposalsUseCase,
    AcceptProposalUseCase,
    RejectProposalUseCase,
  ],
})
export class PotentScanModule {}
