import { ScanDate } from '../value-objects/scan-date';
import { RsScore } from '../value-objects/rs-score';
import { InvariantError } from '../domain-errors';

export interface LeaderScanResultData {
  id: string;
  symbol: string;
  scanDate: ScanDate;
  exchange: string;
  sector: string;
  perf1M: number;
  perf3M: number;
  perf6M: number;
  rank1M: number;
  rank3M: number;
  rank6M: number;
  rsScore: RsScore;
  adr20: number;
  dollarVolume20: number;
  top1MFlag: boolean;
  top3MFlag: boolean;
  top6MFlag: boolean;
  smallSizeFlag: boolean;
  createdAt: Date;
}

export class LeaderScanResult {
  private constructor(
    public readonly id: string,
    public readonly symbol: string,
    public readonly scanDate: ScanDate,
    public readonly exchange: string,
    public readonly sector: string,
    public readonly perf1M: number,
    public readonly perf3M: number,
    public readonly perf6M: number,
    public readonly rank1M: number,
    public readonly rank3M: number,
    public readonly rank6M: number,
    public readonly rsScore: RsScore,
    public readonly adr20: number,
    public readonly dollarVolume20: number,
    public readonly top1MFlag: boolean,
    public readonly top3MFlag: boolean,
    public readonly top6MFlag: boolean,
    public readonly smallSizeFlag: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(
    data: Omit<LeaderScanResultData, 'id' | 'createdAt'>,
  ): LeaderScanResult {
    if (!data.symbol) {
      throw new InvariantError('symbol is required');
    }
    return new LeaderScanResult(
      crypto.randomUUID(),
      data.symbol,
      data.scanDate,
      data.exchange,
      data.sector,
      data.perf1M,
      data.perf3M,
      data.perf6M,
      data.rank1M,
      data.rank3M,
      data.rank6M,
      data.rsScore,
      data.adr20,
      data.dollarVolume20,
      data.top1MFlag,
      data.top3MFlag,
      data.top6MFlag,
      data.smallSizeFlag,
      new Date(),
    );
  }

  static fromData(data: LeaderScanResultData): LeaderScanResult {
    return new LeaderScanResult(
      data.id,
      data.symbol,
      data.scanDate,
      data.exchange,
      data.sector,
      data.perf1M,
      data.perf3M,
      data.perf6M,
      data.rank1M,
      data.rank3M,
      data.rank6M,
      data.rsScore,
      data.adr20,
      data.dollarVolume20,
      data.top1MFlag,
      data.top3MFlag,
      data.top6MFlag,
      data.smallSizeFlag,
      data.createdAt,
    );
  }
}
