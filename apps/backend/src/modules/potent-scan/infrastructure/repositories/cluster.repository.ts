import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { ClusterRepository } from '../../domain/repositories/cluster.repository.interface';
import {
  Cluster,
  ClusterMember,
  ClusterStatus,
} from '../../domain/entities/cluster';
import { ClusterId } from '../../domain/value-objects/cluster-id';
import { SessionDate } from '../../domain/value-objects/session-date';

interface ClusterRow {
  id: string;
  name: string;
  description: string;
  shared_catalyst: string | null;
  sources: string[];
  origin_proposal_id: string | null;
  source_scan_date: string;
  status: ClusterStatus;
  created_at: Date;
  closed_at: Date | null;
}

interface MemberRow {
  id: string;
  cluster_id: string;
  ticker: string;
  joined_at: Date;
  reason: string | null;
  catalyst: string | null;
  source: string | null;
  removed_at: Date | null;
}

const CLUSTER_COLUMNS = `id, name, description, shared_catalyst, sources, origin_proposal_id,
  source_scan_date::text AS source_scan_date, status, created_at, closed_at`;

@Injectable()
export class ClusterRepositoryImpl implements ClusterRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(cluster: Cluster): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `INSERT INTO potent_clusters
         (id, name, description, shared_catalyst, sources, origin_proposal_id,
          source_scan_date, status, created_at, closed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           closed_at = EXCLUDED.closed_at`,
        [
          cluster.id.value,
          cluster.name,
          cluster.description,
          cluster.sharedCatalyst,
          cluster.sources,
          cluster.originProposalId,
          cluster.sourceScanDate.value,
          cluster.status,
          cluster.createdAt,
          cluster.closedAt,
        ],
      );

      for (const member of cluster.members) {
        await client.query(
          `INSERT INTO potent_cluster_members
           (id, cluster_id, ticker, joined_at, reason, catalyst, source, removed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET removed_at = EXCLUDED.removed_at`,
          [
            member.id,
            cluster.id.value,
            member.ticker.value,
            member.joinedAt,
            member.reason,
            member.catalyst,
            member.source,
            member.removedAt,
          ],
        );
      }
    });
  }

  async findById(id: ClusterId): Promise<Cluster | null> {
    const clusters = await this.findClusters('WHERE id = $1', [id.value]);
    return clusters[0] ?? null;
  }

  async findAll(status?: ClusterStatus): Promise<Cluster[]> {
    return status
      ? this.findClusters('WHERE status = $1 ORDER BY created_at DESC', [
          status,
        ])
      : this.findClusters('ORDER BY created_at DESC', []);
  }

  private async findClusters(
    clause: string,
    params: string[],
  ): Promise<Cluster[]> {
    const clusters = (await this.databaseService.query(
      `SELECT ${CLUSTER_COLUMNS} FROM potent_clusters ${clause}`,
      params,
    )) as { rows: ClusterRow[] };
    if (clusters.rows.length === 0) return [];

    const members = (await this.databaseService.query(
      `SELECT id, cluster_id, ticker, joined_at, reason, catalyst, source, removed_at
       FROM potent_cluster_members
       WHERE cluster_id = ANY($1)
       ORDER BY joined_at, ticker`,
      [clusters.rows.map((row) => row.id)],
    )) as { rows: MemberRow[] };

    return clusters.rows.map((row) =>
      Cluster.fromData({
        id: ClusterId.of(row.id),
        name: row.name,
        description: row.description,
        sharedCatalyst: row.shared_catalyst,
        sources: row.sources,
        originProposalId: row.origin_proposal_id,
        sourceScanDate: SessionDate.of(row.source_scan_date),
        createdAt: row.created_at,
        status: row.status,
        closedAt: row.closed_at,
        members: members.rows
          .filter((member) => member.cluster_id === row.id)
          .map((member) => this.toMember(member)),
      }),
    );
  }

  private toMember(row: MemberRow): ClusterMember {
    return {
      id: row.id,
      ticker: Symbol.of(row.ticker),
      joinedAt: row.joined_at,
      reason: row.reason,
      catalyst: row.catalyst,
      source: row.source,
      removedAt: row.removed_at,
    };
  }
}
