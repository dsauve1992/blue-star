import type { LeaderBreadthSnapshot } from '../entities/leader-breadth-snapshot.entity';

export interface LeaderBreadthRepository {
  save(snapshot: LeaderBreadthSnapshot): Promise<void>;
  /**
   * Most recent N snapshots ordered by computed_at DESC. Used to compute the
   * leader-count moving average and to chart the breadth series.
   */
  findRecent(limit: number): Promise<LeaderBreadthSnapshot[]>;
}
