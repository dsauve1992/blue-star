import { Inject, Injectable } from '@nestjs/common';
import { LeaderScanRepository } from '../domain/repositories/leader-scan.repository.interface';
import { LEADER_SCAN_REPOSITORY } from '../constants/tokens';

export interface LeaderDto {
  symbol: string;
  scanDate: string;
  exchange: string;
  sector: string;
  perf1M: number;
  perf3M: number;
  perf6M: number;
  rank1M: number;
  rank3M: number;
  rank6M: number;
  rsScore: number;
  adr20: number;
  dollarVolume20: number;
  top1MFlag: boolean;
  top3MFlag: boolean;
  top6MFlag: boolean;
  smallSizeFlag: boolean;
}

export interface QueryLatestLeadersResponseDto {
  scanDate: string | null;
  count: number;
  leaders: LeaderDto[];
}

@Injectable()
export class QueryLatestLeadersUseCase {
  constructor(
    @Inject(LEADER_SCAN_REPOSITORY)
    private readonly repository: LeaderScanRepository,
  ) {}

  async execute(): Promise<QueryLatestLeadersResponseDto> {
    const results = await this.repository.getLatestResults();

    return {
      scanDate: results[0]?.scanDate.toISOString() ?? null,
      count: results.length,
      leaders: results.map((r) => ({
        symbol: r.symbol,
        scanDate: r.scanDate.toISOString(),
        exchange: r.exchange,
        sector: r.sector,
        perf1M: r.perf1M,
        perf3M: r.perf3M,
        perf6M: r.perf6M,
        rank1M: r.rank1M,
        rank3M: r.rank3M,
        rank6M: r.rank6M,
        rsScore: r.rsScore.value,
        adr20: r.adr20,
        dollarVolume20: r.dollarVolume20,
        top1MFlag: r.top1MFlag,
        top3MFlag: r.top3MFlag,
        top6MFlag: r.top6MFlag,
        smallSizeFlag: r.smallSizeFlag,
      })),
    };
  }
}
