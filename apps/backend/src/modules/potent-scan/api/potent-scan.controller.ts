import { Controller, Get, Param, Post } from '@nestjs/common';
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
import { TrackMemberTiersUseCase } from '../use-cases/track-member-tiers.use-case';
import { SessionDate } from '../domain/value-objects/session-date';

@Controller('potent-scan')
export class PotentScanController {
  constructor(
    private readonly getPotentScanUseCase: GetPotentScanUseCase,
    private readonly listPotentScanDatesUseCase: ListPotentScanDatesUseCase,
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
    private readonly trackMemberTiersUseCase: TrackMemberTiersUseCase,
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
  async runScan(): Promise<{ scanDate: string; hitCount: number }> {
    const { sessionDate, hitCount } = await this.runPotentScanUseCase.execute({
      replaceExisting: true,
    });
    return { scanDate: sessionDate.value, hitCount };
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
