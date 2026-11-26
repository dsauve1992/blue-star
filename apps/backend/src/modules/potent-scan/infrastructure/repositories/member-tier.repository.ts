import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { MemberTierRepository } from '../../domain/repositories/member-tier.repository.interface';
import {
  DailyTierCounts,
  MemberTier,
} from '../../domain/value-objects/member-tier';
import { Tier } from '../../domain/value-objects/potent-scan-stock';
import { ClusterId } from '../../domain/value-objects/cluster-id';
import { SessionDate } from '../../domain/value-objects/session-date';

interface TierRow {
  member_id: string;
  session_date: string;
  tier: Tier;
  close: number;
  ema9: number;
  ema21: number;
  ema50: number;
  adr_pct: number | null;
}

interface CountRow {
  cluster_id: string;
  session_date: string;
  lead: number;
  mediocre: number;
  lag: number;
}

@Injectable()
export class MemberTierRepositoryImpl implements MemberTierRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async saveAll(tiers: MemberTier[]): Promise<void> {
    if (tiers.length === 0) return;
    await this.databaseService.query(
      `INSERT INTO potent_member_tiers
       (member_id, session_date, tier, close, ema9, ema21, ema50, adr_pct)
       SELECT * FROM unnest($1::uuid[], $2::date[], $3::varchar[], $4::float8[],
                            $5::float8[], $6::float8[], $7::float8[], $8::float8[])
       ON CONFLICT (member_id, session_date) DO UPDATE SET
         tier = EXCLUDED.tier,
         close = EXCLUDED.close,
         ema9 = EXCLUDED.ema9,
         ema21 = EXCLUDED.ema21,
         ema50 = EXCLUDED.ema50,
         adr_pct = EXCLUDED.adr_pct`,
      [
        tiers.map((t) => t.memberId),
        tiers.map((t) => t.date.value),
        tiers.map((t) => t.tier),
        tiers.map((t) => t.close),
        tiers.map((t) => t.ema9),
        tiers.map((t) => t.ema21),
        tiers.map((t) => t.ema50),
        tiers.map((t) => t.adrPct),
      ],
    );
  }

  async findByCluster(clusterId: ClusterId): Promise<MemberTier[]> {
    const result = (await this.databaseService.query(
      `SELECT t.member_id, t.session_date::text AS session_date, t.tier,
              t.close, t.ema9, t.ema21, t.ema50, t.adr_pct
       FROM potent_member_tiers t
       JOIN potent_cluster_members m ON m.id = t.member_id
       WHERE m.cluster_id = $1
       ORDER BY t.member_id, t.session_date`,
      [clusterId.value],
    )) as { rows: TierRow[] };
    return result.rows.map((row) => ({
      memberId: row.member_id,
      date: SessionDate.of(row.session_date),
      tier: row.tier,
      close: row.close,
      ema9: row.ema9,
      ema21: row.ema21,
      ema50: row.ema50,
      adrPct: row.adr_pct,
    }));
  }

  async dailyCountsByCluster(
    clusterIds: ClusterId[],
  ): Promise<Map<string, DailyTierCounts[]>> {
    const counts = new Map<string, DailyTierCounts[]>();
    if (clusterIds.length === 0) return counts;

    const result = (await this.databaseService.query(
      `SELECT m.cluster_id, t.session_date::text AS session_date,
              COUNT(*) FILTER (WHERE t.tier = 'Lead')::int AS lead,
              COUNT(*) FILTER (WHERE t.tier = 'Mediocre')::int AS mediocre,
              COUNT(*) FILTER (WHERE t.tier = 'Lag')::int AS lag
       FROM potent_member_tiers t
       JOIN potent_cluster_members m ON m.id = t.member_id
       WHERE m.cluster_id = ANY($1)
       GROUP BY m.cluster_id, t.session_date
       ORDER BY t.session_date`,
      [clusterIds.map((id) => id.value)],
    )) as { rows: CountRow[] };

    for (const row of result.rows) {
      const series = counts.get(row.cluster_id) ?? [];
      series.push({
        date: SessionDate.of(row.session_date),
        lead: row.lead,
        mediocre: row.mediocre,
        lag: row.lag,
      });
      counts.set(row.cluster_id, series);
    }
    return counts;
  }

  async activeLeadCountsOnLatestDate(
    clusterIds: ClusterId[],
  ): Promise<Map<string, number>> {
    if (clusterIds.length === 0) return new Map();

    const result = (await this.databaseService.query(
      `WITH cluster_tiers AS (
         SELECT m.cluster_id, m.removed_at, t.session_date, t.tier,
                MAX(t.session_date) OVER (PARTITION BY m.cluster_id) AS latest_date
         FROM potent_member_tiers t
         JOIN potent_cluster_members m ON m.id = t.member_id
         WHERE m.cluster_id = ANY($1)
       )
       SELECT cluster_id,
              COUNT(*) FILTER (WHERE tier = 'Lead' AND removed_at IS NULL)::int AS lead
       FROM cluster_tiers
       WHERE session_date = latest_date
       GROUP BY cluster_id`,
      [clusterIds.map((id) => id.value)],
    )) as { rows: { cluster_id: string; lead: number }[] };

    return new Map(result.rows.map((row) => [row.cluster_id, row.lead]));
  }
}
