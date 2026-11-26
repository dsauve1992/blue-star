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
import { SessionDate } from '../domain/value-objects/session-date';

@Controller('potent-scan')
export class PotentScanController {
  constructor(
    private readonly getPotentScanUseCase: GetPotentScanUseCase,
    private readonly listPotentScanDatesUseCase: ListPotentScanDatesUseCase,
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
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
}
