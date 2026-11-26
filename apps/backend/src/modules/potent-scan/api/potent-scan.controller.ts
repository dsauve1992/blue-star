import { Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { Public } from '../../auth/auth.module';
import {
  GetPotentScanResponseDto,
  GetPotentScanUseCase,
} from '../use-cases/get-potent-scan.use-case';
import {
  ListPotentScanDatesResponseDto,
  ListPotentScanDatesUseCase,
} from '../use-cases/list-potent-scan-dates.use-case';
import { RunPotentScanUseCase } from '../use-cases/run-potent-scan.use-case';
import { ResearchPotentHitsUseCase } from '../use-cases/research-potent-hits.use-case';
import { TrackMemberTiersUseCase } from '../use-cases/track-member-tiers.use-case';
import { ProposeClustersUseCase } from '../use-cases/propose-clusters.use-case';
import { SessionDate } from '../domain/value-objects/session-date';

type ResearchOutcome =
  | { status: 'succeeded'; researchedCount: number; costUsd: number }
  | { status: 'failed'; error: string };

type ProposalsOutcome =
  | { status: 'succeeded'; proposalCount: number; costUsd: number }
  | { status: 'failed'; error: string }
  | { status: 'skipped' };

@Controller('potent-scan')
export class PotentScanController {
  private readonly logger = new Logger(PotentScanController.name);

  constructor(
    private readonly getPotentScanUseCase: GetPotentScanUseCase,
    private readonly listPotentScanDatesUseCase: ListPotentScanDatesUseCase,
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
    private readonly researchPotentHitsUseCase: ResearchPotentHitsUseCase,
    private readonly trackMemberTiersUseCase: TrackMemberTiersUseCase,
    private readonly proposeClustersUseCase: ProposeClustersUseCase,
  ) {}

  @Get('scans')
  @Public()
  async listScans(): Promise<ListPotentScanDatesResponseDto> {
    return this.listPotentScanDatesUseCase.execute();
  }

  @Get('scans/:date')
  @Public()
  async getScan(
    @Param('date') date: string,
  ): Promise<GetPotentScanResponseDto> {
    return this.getPotentScanUseCase.execute({
      sessionDate: date === 'latest' ? 'latest' : SessionDate.of(date),
    });
  }

  @Post('scans/run')
  async runScan(): Promise<{
    scanDate: string;
    hitCount: number;
    research: ResearchOutcome;
    proposals: ProposalsOutcome;
  }> {
    const { sessionDate, hitCount } = await this.runPotentScanUseCase.execute({
      replaceExisting: true,
    });

    let research: ResearchOutcome;
    try {
      const { researchedCount, usage } =
        await this.researchPotentHitsUseCase.execute({ sessionDate });
      research = {
        status: 'succeeded',
        researchedCount,
        costUsd: usage.costUsd,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent hit research failed: ${message}`);
      research = { status: 'failed', error: message };
    }

    const proposals: ProposalsOutcome =
      research.status === 'succeeded'
        ? await this.proposeClusters(sessionDate)
        : { status: 'skipped' };

    return { scanDate: sessionDate.value, hitCount, research, proposals };
  }

  @Post('scans/:date/research')
  async researchScan(@Param('date') date: string): Promise<{
    scanDate: string;
    researchedCount: number;
    costUsd: number;
    proposals: ProposalsOutcome;
  }> {
    const { sessionDate, researchedCount, usage } =
      await this.researchPotentHitsUseCase.execute({
        sessionDate: SessionDate.of(date),
      });
    return {
      scanDate: sessionDate.value,
      researchedCount,
      costUsd: usage.costUsd,
      proposals: await this.proposeClusters(sessionDate),
    };
  }

  private async proposeClusters(
    sessionDate: SessionDate,
  ): Promise<ProposalsOutcome> {
    try {
      const { newClusterCount, additionCount, usage } =
        await this.proposeClustersUseCase.execute({ sessionDate });
      return {
        status: 'succeeded',
        proposalCount: newClusterCount + additionCount,
        costUsd: usage.costUsd,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent cluster proposals failed: ${message}`);
      return { status: 'failed', error: message };
    }
  }

  @Post('tiers/run')
  async trackTiers(): Promise<{
    sessionDate: string;
    tierCount: number;
    failures: string[];
  }> {
    const { sessionDate, tierCount, failures } =
      await this.trackMemberTiersUseCase.execute();
    return { sessionDate: sessionDate.value, tierCount, failures };
  }
}
