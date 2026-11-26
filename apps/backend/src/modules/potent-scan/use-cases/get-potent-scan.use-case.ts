import { Inject, Injectable } from '@nestjs/common';
import { POTENT_SCAN_REPOSITORY } from '../constants/tokens';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import { SessionDate } from '../domain/value-objects/session-date';
import {
  PotentScanHit,
  PotentScanNearMiss,
} from '../domain/value-objects/potent-scan-stock';
import { NotFoundError } from '../domain/domain-errors';
import { GetLatestMomentumLeaderSymbolsUseCase } from '../../stock-analysis/stock-analysis.module';

export interface GetPotentScanRequestDto {
  sessionDate: SessionDate | 'latest';
}

export interface PotentScanHitDto extends PotentScanHit {
  isMomentumLeader: boolean;
}

export interface GetPotentScanResponseDto {
  scanDate: string;
  universeSize: number;
  hits: PotentScanHitDto[];
  nearMisses: PotentScanNearMiss[];
}

@Injectable()
export class GetPotentScanUseCase {
  constructor(
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly repository: PotentScanRepository,
    private readonly getLatestMomentumLeaderSymbols: GetLatestMomentumLeaderSymbolsUseCase,
  ) {}

  async execute(
    request: GetPotentScanRequestDto,
  ): Promise<GetPotentScanResponseDto> {
    const scan =
      request.sessionDate === 'latest'
        ? await this.repository.findLatest()
        : await this.repository.findBySessionDate(request.sessionDate);

    if (!scan) {
      const label =
        request.sessionDate === 'latest'
          ? 'No potent scan stored yet'
          : `No potent scan for session ${request.sessionDate.value}`;
      throw new NotFoundError(label);
    }

    const leaders = await this.getLatestMomentumLeaderSymbols.execute();
    const leaderSymbols = new Set(leaders?.symbols ?? []);

    return {
      scanDate: scan.sessionDate.value,
      universeSize: scan.universeSize,
      hits: scan.hits.map((hit) => ({
        ...hit,
        isMomentumLeader: leaderSymbols.has(hit.symbol),
      })),
      nearMisses: scan.nearMisses,
    };
  }
}
