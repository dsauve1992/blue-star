import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { MarketRegime } from '../../domain/entities/market-regime.entity';
import { RegimeState } from '../../domain/value-objects/regime-state';
import { BreadthSignal } from '../../domain/value-objects/breadth-signal';
import { MarketHealthStatus } from '../../../market-health/domain/value-objects/market-health-status';
import type { MarketRegimeRepository as IMarketRegimeRepository } from '../../domain/repositories/market-regime.repository.interface';

interface DatabaseRow {
  id: string;
  state: string;
  market_health_status: string;
  leader_count: number;
  leader_count_ma: number;
  breadth_signal: string;
  computed_at: string;
  created_at: string;
}

@Injectable()
export class MarketRegimeRepositoryImpl implements IMarketRegimeRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(regime: MarketRegime): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO market_regime (id, state, market_health_status, leader_count, leader_count_ma, breadth_signal, computed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        regime.id,
        regime.state.value,
        regime.marketHealthStatus,
        regime.leaderCount,
        regime.leaderCountMa,
        regime.breadthSignal.value,
        regime.computedAt.toISOString(),
      ],
    );
  }

  async findLatest(): Promise<MarketRegime | null> {
    const result = await this.databaseService.query(
      `SELECT id, state, market_health_status, leader_count, leader_count_ma, breadth_signal, computed_at, created_at
       FROM market_regime
       ORDER BY computed_at DESC
       LIMIT 1`,
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0] as DatabaseRow);
  }

  private mapRowToEntity(row: DatabaseRow): MarketRegime {
    return MarketRegime.create({
      id: row.id,
      state: RegimeState.of(row.state),
      marketHealthStatus: MarketHealthStatus.of(row.market_health_status).value,
      leaderCount: row.leader_count,
      leaderCountMa: row.leader_count_ma,
      breadthSignal: BreadthSignal.of(row.breadth_signal),
      computedAt: new Date(row.computed_at),
    });
  }
}
