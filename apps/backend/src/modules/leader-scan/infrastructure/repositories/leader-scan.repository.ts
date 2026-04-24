import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { LeaderScanRepository } from '../../domain/repositories/leader-scan.repository.interface';
import { LeaderScanRun } from '../../domain/entities/leader-scan-run';
import { LeaderScanResult } from '../../domain/entities/leader-scan-result';
import { ScanDate } from '../../domain/value-objects/scan-date';
import { RsScore } from '../../domain/value-objects/rs-score';

interface LeaderScanResultRow {
  id: string;
  symbol: string;
  scan_date: string;
  exchange: string | null;
  sector: string | null;
  perf_1m: string;
  perf_3m: string;
  perf_6m: string;
  rank_1m: string;
  rank_3m: string;
  rank_6m: string;
  rs_score: string;
  adr_20: string;
  dollar_volume_20: string;
  top_1m_flag: boolean;
  top_3m_flag: boolean;
  top_6m_flag: boolean;
  small_size_flag: boolean;
  created_at: string;
}

@Injectable()
export class LeaderScanRepositoryImpl implements LeaderScanRepository {
  constructor(private readonly db: DatabaseService) {}

  async saveRun(run: LeaderScanRun): Promise<void> {
    const scanDateStr = run.scanDate.toISOString();
    await this.db.query(
      `INSERT INTO leader_scan_runs
        (id, scan_date, status, universe_size, leader_count, error_message, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (scan_date) DO UPDATE SET
         status = EXCLUDED.status,
         universe_size = EXCLUDED.universe_size,
         leader_count = EXCLUDED.leader_count,
         error_message = EXCLUDED.error_message,
         completed_at = EXCLUDED.completed_at`,
      [
        run.id,
        scanDateStr,
        run.status,
        run.universeSize ?? null,
        run.leaderCount ?? null,
        run.errorMessage ?? null,
        run.startedAt,
        run.completedAt ?? null,
      ],
    );
  }

  async saveResults(
    run: LeaderScanRun,
    results: LeaderScanResult[],
  ): Promise<void> {
    await this.db.transaction(async (client) => {
      const scanDateStr = run.scanDate.toISOString();

      await client.query(
        'DELETE FROM leader_scan_results WHERE scan_date = $1',
        [scanDateStr],
      );

      for (const r of results) {
        await client.query(
          `INSERT INTO leader_scan_results
            (id, symbol, scan_date, exchange, sector,
             perf_1m, perf_3m, perf_6m,
             rank_1m, rank_3m, rank_6m, rs_score,
             adr_20, dollar_volume_20,
             top_1m_flag, top_3m_flag, top_6m_flag, small_size_flag,
             created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())`,
          [
            r.id,
            r.symbol,
            scanDateStr,
            r.exchange,
            r.sector,
            r.perf1M,
            r.perf3M,
            r.perf6M,
            r.rank1M,
            r.rank3M,
            r.rank6M,
            r.rsScore.value,
            r.adr20,
            r.dollarVolume20,
            r.top1MFlag,
            r.top3MFlag,
            r.top6MFlag,
            r.smallSizeFlag,
          ],
        );
      }
    });
  }

  async getLatestResults(): Promise<LeaderScanResult[]> {
    const result = (await this.db.query(
      `SELECT * FROM leader_scan_results
       WHERE scan_date = (SELECT MAX(scan_date) FROM leader_scan_results)
       ORDER BY rs_score DESC, symbol ASC`,
    )) as { rows: LeaderScanResultRow[] };

    return result.rows.map((row) => this.toEntity(row));
  }

  async getResultsForDate(scanDate: ScanDate): Promise<LeaderScanResult[]> {
    const result = (await this.db.query(
      `SELECT * FROM leader_scan_results
       WHERE scan_date = $1
       ORDER BY rs_score DESC, symbol ASC`,
      [scanDate.toISOString()],
    )) as { rows: LeaderScanResultRow[] };

    return result.rows.map((row) => this.toEntity(row));
  }

  async getLatestResultForSymbol(
    symbol: string,
  ): Promise<LeaderScanResult | null> {
    const result = (await this.db.query(
      `SELECT * FROM leader_scan_results
       WHERE symbol = $1
       ORDER BY scan_date DESC
       LIMIT 1`,
      [symbol],
    )) as { rows: LeaderScanResultRow[] };

    if (result.rows.length === 0) return null;
    return this.toEntity(result.rows[0]);
  }

  private toEntity(row: LeaderScanResultRow): LeaderScanResult {
    return LeaderScanResult.fromData({
      id: row.id,
      symbol: row.symbol,
      scanDate: ScanDate.of(new Date(row.scan_date)),
      exchange: row.exchange ?? '',
      sector: row.sector ?? '',
      perf1M: parseFloat(row.perf_1m),
      perf3M: parseFloat(row.perf_3m),
      perf6M: parseFloat(row.perf_6m),
      rank1M: parseFloat(row.rank_1m),
      rank3M: parseFloat(row.rank_3m),
      rank6M: parseFloat(row.rank_6m),
      rsScore: RsScore.of(parseFloat(row.rs_score)),
      adr20: parseFloat(row.adr_20),
      dollarVolume20: parseFloat(row.dollar_volume_20),
      top1MFlag: row.top_1m_flag,
      top3MFlag: row.top_3m_flag,
      top6MFlag: row.top_6m_flag,
      smallSizeFlag: row.small_size_flag,
      createdAt: new Date(row.created_at),
    });
  }
}
