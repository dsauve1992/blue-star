import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { LeaderBreadthSnapshot } from '../../domain/entities/leader-breadth-snapshot.entity';
import type { LeaderBreadthRepository as ILeaderBreadthRepository } from '../../domain/repositories/leader-breadth.repository.interface';

interface DatabaseRow {
  id: string;
  leader_count: number;
  total_universe: number;
  rs_threshold: number;
  computed_at: string;
  created_at: string;
}

@Injectable()
export class LeaderBreadthRepositoryImpl implements ILeaderBreadthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(snapshot: LeaderBreadthSnapshot): Promise<void> {
    const computedAtStr = snapshot.computedAt.toISOString().split('T')[0];

    await this.databaseService.query(
      `INSERT INTO leader_breadth_snapshots (id, leader_count, total_universe, rs_threshold, computed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (computed_at, rs_threshold) DO UPDATE SET
       leader_count = EXCLUDED.leader_count,
       total_universe = EXCLUDED.total_universe`,
      [
        snapshot.id,
        snapshot.leaderCount,
        snapshot.totalUniverse,
        snapshot.rsThreshold,
        computedAtStr,
      ],
    );
  }

  async findRecent(limit: number): Promise<LeaderBreadthSnapshot[]> {
    const result = await this.databaseService.query(
      `SELECT id, leader_count, total_universe, rs_threshold, computed_at, created_at
       FROM leader_breadth_snapshots
       ORDER BY computed_at DESC
       LIMIT $1`,
      [limit],
    );

    return (result.rows as DatabaseRow[]).map((row) =>
      this.mapRowToEntity(row),
    );
  }

  private mapRowToEntity(row: DatabaseRow): LeaderBreadthSnapshot {
    return LeaderBreadthSnapshot.create({
      id: row.id,
      leaderCount: row.leader_count,
      totalUniverse: row.total_universe,
      rsThreshold: row.rs_threshold,
      computedAt: new Date(row.computed_at),
    });
  }
}
