import { Inject, Injectable } from '@nestjs/common';
import { LeaderScanRepository } from '../domain/repositories/leader-scan.repository.interface';
import {
  BreadthDirection,
  BREADTH_LOOKBACK,
  classifyBreadth,
} from '../domain/services/leader-breadth.service';
import { BreadthRegimeValue } from '../domain/value-objects/breadth-regime';
import { LEADER_SCAN_REPOSITORY } from '../constants/tokens';

export interface BreadthSeriesPointDto {
  scanDate: string;
  leaderCount: number;
  leaderPct: number;
}

export interface QueryLeaderBreadthResponseDto {
  /** Null when no completed scan exists yet. */
  scanDate: string | null;
  regime: BreadthRegimeValue | null;
  leaderCount: number | null;
  breadthMa: number | null;
  leaderPct: number | null;
  direction: BreadthDirection | null;
  sampleSize: number;
  provisional: boolean;
  series: BreadthSeriesPointDto[];
}

@Injectable()
export class QueryLeaderBreadthUseCase {
  constructor(
    @Inject(LEADER_SCAN_REPOSITORY)
    private readonly repository: LeaderScanRepository,
  ) {}

  async execute(): Promise<QueryLeaderBreadthResponseDto> {
    const runs = await this.repository.getRecentCompletedRuns(BREADTH_LOOKBACK);
    const snapshot = classifyBreadth(runs);

    if (!snapshot) {
      return {
        scanDate: null,
        regime: null,
        leaderCount: null,
        breadthMa: null,
        leaderPct: null,
        direction: null,
        sampleSize: 0,
        provisional: true,
        series: [],
      };
    }

    return {
      scanDate: snapshot.scanDate,
      regime: snapshot.regime.value,
      leaderCount: snapshot.leaderCount,
      breadthMa: snapshot.breadthMa,
      leaderPct: snapshot.leaderPct,
      direction: snapshot.direction,
      sampleSize: snapshot.sampleSize,
      provisional: snapshot.provisional,
      series: snapshot.series,
    };
  }
}
