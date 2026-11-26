import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { PotentScanRepository } from '../../domain/repositories/potent-scan.repository.interface';
import { PotentScan } from '../../domain/entities/potent-scan';
import { SessionDate } from '../../domain/value-objects/session-date';
import {
  PotentScanHit,
  Tier,
} from '../../domain/value-objects/potent-scan-stock';

interface ScanRow {
  id: string;
  scan_date: string;
  universe_size: number;
}

interface HitRow {
  symbol: string;
  exchange: string;
  change_pct: number;
  close: number | null;
  adr_pct: number | null;
  relative_volume: number | null;
  market_cap: number | null;
  sector: string;
  industry: string;
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  tier: Tier | null;
}

interface NearMissRow extends HitRow {
  value_traded: number | null;
  avg_value_traded_30d: number | null;
}

const HIT_COLUMNS = `symbol, exchange, change_pct, close, adr_pct, relative_volume, market_cap,
  sector, industry, ema9, ema21, ema50, tier`;

@Injectable()
export class PotentScanRepositoryImpl implements PotentScanRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async replace(scan: PotentScan): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query('DELETE FROM potent_scans WHERE scan_date = $1', [
        scan.sessionDate.value,
      ]);

      const inserted = (await client.query(
        `INSERT INTO potent_scans (scan_date, universe_size) VALUES ($1, $2) RETURNING id`,
        [scan.sessionDate.value, scan.universeSize],
      )) as { rows: { id: string }[] };
      const scanId = inserted.rows[0].id;

      for (const hit of scan.hits) {
        await client.query(
          `INSERT INTO potent_scan_hits (scan_id, ${HIT_COLUMNS})
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [scanId, ...this.hitValues(hit)],
        );
      }

      for (const nearMiss of scan.nearMisses) {
        await client.query(
          `INSERT INTO potent_scan_near_misses
           (scan_id, ${HIT_COLUMNS}, value_traded, avg_value_traded_30d)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            scanId,
            ...this.hitValues(nearMiss),
            nearMiss.valueTraded,
            nearMiss.avgValueTraded30d,
          ],
        );
      }
    });
  }

  async exists(sessionDate: SessionDate): Promise<boolean> {
    const result = (await this.databaseService.query(
      'SELECT 1 FROM potent_scans WHERE scan_date = $1',
      [sessionDate.value],
    )) as { rows: unknown[] };
    return result.rows.length > 0;
  }

  async findBySessionDate(
    sessionDate: SessionDate,
  ): Promise<PotentScan | null> {
    return this.findScan('WHERE scan_date = $1', [sessionDate.value]);
  }

  async findLatest(): Promise<PotentScan | null> {
    return this.findScan('ORDER BY scan_date DESC LIMIT 1', []);
  }

  async listSessionDates(): Promise<SessionDate[]> {
    const result = (await this.databaseService.query(
      'SELECT scan_date::text AS scan_date FROM potent_scans ORDER BY scan_date DESC',
    )) as { rows: { scan_date: string }[] };
    return result.rows.map((row) => SessionDate.of(row.scan_date));
  }

  private async findScan(
    clause: string,
    params: string[],
  ): Promise<PotentScan | null> {
    const scans = (await this.databaseService.query(
      `SELECT id, scan_date::text AS scan_date, universe_size FROM potent_scans ${clause}`,
      params,
    )) as { rows: ScanRow[] };
    const scan = scans.rows[0];
    if (!scan) return null;

    const hits = (await this.databaseService.query(
      `SELECT ${HIT_COLUMNS} FROM potent_scan_hits
       WHERE scan_id = $1 ORDER BY change_pct DESC, symbol`,
      [scan.id],
    )) as { rows: HitRow[] };
    const nearMisses = (await this.databaseService.query(
      `SELECT ${HIT_COLUMNS}, value_traded, avg_value_traded_30d
       FROM potent_scan_near_misses
       WHERE scan_id = $1 ORDER BY change_pct DESC, symbol`,
      [scan.id],
    )) as { rows: NearMissRow[] };

    return PotentScan.of({
      sessionDate: SessionDate.of(scan.scan_date),
      universeSize: scan.universe_size,
      hits: hits.rows.map((row) => this.toHit(row)),
      nearMisses: nearMisses.rows.map((row) => ({
        ...this.toHit(row),
        valueTraded: row.value_traded,
        avgValueTraded30d: row.avg_value_traded_30d,
      })),
    });
  }

  private hitValues(hit: PotentScanHit): unknown[] {
    return [
      hit.symbol,
      hit.exchange,
      hit.changePct,
      hit.close,
      hit.adrPct,
      hit.relativeVolume,
      hit.marketCap,
      hit.sector,
      hit.industry,
      hit.ema9,
      hit.ema21,
      hit.ema50,
      hit.tier,
    ];
  }

  private toHit(row: HitRow): PotentScanHit {
    return {
      symbol: row.symbol,
      exchange: row.exchange,
      changePct: row.change_pct,
      close: row.close,
      adrPct: row.adr_pct,
      relativeVolume: row.relative_volume,
      marketCap: row.market_cap,
      sector: row.sector,
      industry: row.industry,
      ema9: row.ema9,
      ema21: row.ema21,
      ema50: row.ema50,
      tier: row.tier,
    };
  }
}
