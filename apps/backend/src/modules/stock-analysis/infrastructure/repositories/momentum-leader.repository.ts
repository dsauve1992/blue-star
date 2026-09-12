import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { MomentumLeaderRepository } from '../../domain/repositories/momentum-leader.repository.interface';
import { MomentumLeader } from '../../domain/value-objects/momentum-leader';

interface MomentumLeaderRow {
  symbol: string;
  exchange: string;
  sector: string | null;
  perf_1m: string;
  perf_3m: string;
  perf_6m: string;
  adr_pct: string;
  rank_1m: string;
  rank_3m: string;
  rank_6m: string;
  rs_score: string;
  top_1m: boolean;
  top_3m: boolean;
  top_6m: boolean;
  scan_date: string;
  universe_size: number;
}

@Injectable()
export class MomentumLeaderRepositoryImpl implements MomentumLeaderRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async replaceScan(scanDate: Date, leaders: MomentumLeader[]): Promise<void> {
    const scanDateStr = scanDate.toISOString().split('T')[0];

    await this.databaseService.transaction(async (client) => {
      await client.query('DELETE FROM momentum_leaders WHERE scan_date = $1', [
        scanDateStr,
      ]);

      for (const leader of leaders) {
        await client.query(
          `INSERT INTO momentum_leaders
           (scan_date, symbol, exchange, sector, perf_1m, perf_3m, perf_6m, adr_pct,
            rank_1m, rank_3m, rank_6m, rs_score, top_1m, top_3m, top_6m, universe_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            scanDateStr,
            leader.symbol,
            leader.exchange,
            leader.sector,
            leader.perf1M,
            leader.perf3M,
            leader.perf6M,
            leader.adrPct,
            leader.rank1M,
            leader.rank3M,
            leader.rank6M,
            leader.rsScore,
            leader.top1M,
            leader.top3M,
            leader.top6M,
            leader.universeSize,
          ],
        );
      }
    });
  }

  async getLatestScan(): Promise<MomentumLeader[]> {
    const result = (await this.databaseService.query(
      `SELECT symbol, exchange, sector, perf_1m, perf_3m, perf_6m, adr_pct,
              rank_1m, rank_3m, rank_6m, rs_score, top_1m, top_3m, top_6m,
              scan_date, universe_size
       FROM momentum_leaders
       WHERE scan_date = (SELECT MAX(scan_date) FROM momentum_leaders)
       ORDER BY rs_score DESC, symbol`,
    )) as { rows: MomentumLeaderRow[] };

    return result.rows.map((row) =>
      MomentumLeader.of({
        symbol: row.symbol,
        exchange: row.exchange,
        sector: row.sector,
        perf1M: parseFloat(row.perf_1m),
        perf3M: parseFloat(row.perf_3m),
        perf6M: parseFloat(row.perf_6m),
        adrPct: parseFloat(row.adr_pct),
        rank1M: parseFloat(row.rank_1m),
        rank3M: parseFloat(row.rank_3m),
        rank6M: parseFloat(row.rank_6m),
        rsScore: parseFloat(row.rs_score),
        top1M: row.top_1m,
        top3M: row.top_3m,
        top6M: row.top_6m,
        scanDate: new Date(row.scan_date),
        universeSize: row.universe_size,
      }),
    );
  }
}
