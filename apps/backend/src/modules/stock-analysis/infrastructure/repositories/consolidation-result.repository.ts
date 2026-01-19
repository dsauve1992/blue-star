import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { ConsolidationResultRepository } from '../../domain/repositories/consolidation-result.repository.interface';
import { ConsolidationResultEntity } from '../../domain/entities/consolidation-result';
import { ConsolidationRun } from '../../domain/entities/consolidation-run';
import { AnalysisDate } from '../../domain/value-objects/analysis-date';
import { ConsolidationRunStatus } from '../../domain/value-objects/consolidation-run-status';

interface ConsolidationResultRow {
  id: string;
  timeframe: string;
  analysis_date: string;
  symbol: string;
  is_new: boolean;
  ticker_full_name: string;
  sector: string | null;
  industry: string | null;
  created_at: string;
}

interface ConsolidationRunRow {
  id: string;
  timeframe: string;
  analysis_date: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

@Injectable()
export class ConsolidationResultRepositoryImpl
  implements ConsolidationResultRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async saveResults(
    run: ConsolidationRun,
    results: ConsolidationResultEntity[],
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await this.saveRun(run);

      const analysisDateStr = run.analysisDate.toISOString();

      await client.query(
        'DELETE FROM consolidation_results WHERE timeframe = $1 AND analysis_date = $2',
        [run.timeframe, analysisDateStr],
      );

      for (const result of results) {
        await client.query(
          `INSERT INTO consolidation_results 
           (id, timeframe, analysis_date, symbol, is_new, ticker_full_name, sector, industry, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (timeframe, analysis_date, symbol) DO UPDATE SET
           is_new = EXCLUDED.is_new,
           ticker_full_name = EXCLUDED.ticker_full_name,
           sector = EXCLUDED.sector,
           industry = EXCLUDED.industry`,
          [
            result.id,
            result.timeframe,
            analysisDateStr,
            result.symbol,
            result.isNew,
            result.tickerFullName,
            result.sector,
            result.industry,
          ],
        );
      }
    });
  }

  async getLatestResults(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): Promise<ConsolidationResultEntity[]> {
    const analysisDateStr = analysisDate.toISOString();

    const result = (await this.databaseService.query(
      `SELECT id, timeframe, analysis_date, symbol, is_new, ticker_full_name, sector, industry, created_at
       FROM consolidation_results
       WHERE timeframe = $1 AND analysis_date = $2
       ORDER BY symbol`,
      [timeframe, analysisDateStr],
    )) as { rows: ConsolidationResultRow[] };

    return result.rows.map((row) =>
      ConsolidationResultEntity.fromData({
        id: row.id,
        timeframe: row.timeframe as 'daily' | 'weekly',
        analysisDate: AnalysisDate.of(new Date(row.analysis_date)),
        symbol: row.symbol,
        isNew: row.is_new,
        tickerFullName: row.ticker_full_name,
        sector: row.sector,
        industry: row.industry,
        createdAt: new Date(row.created_at),
      }),
    );
  }

  async getLatestRun(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): Promise<ConsolidationRun | null> {
    const analysisDateStr = analysisDate.toISOString();

    const result = (await this.databaseService.query(
      `SELECT id, timeframe, analysis_date, status, error_message, created_at, completed_at
       FROM consolidation_runs
       WHERE timeframe = $1 AND analysis_date = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [timeframe, analysisDateStr],
    )) as { rows: ConsolidationRunRow[] };

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return ConsolidationRun.fromData({
      id: row.id,
      timeframe: row.timeframe as 'daily' | 'weekly',
      analysisDate: AnalysisDate.of(new Date(row.analysis_date)),
      status: row.status as ConsolidationRunStatus,
      errorMessage: row.error_message || undefined,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    });
  }

  async saveRun(run: ConsolidationRun): Promise<void> {
    const analysisDateStr = run.analysisDate.toISOString();

    await this.databaseService.query(
      `INSERT INTO consolidation_runs 
       (id, timeframe, analysis_date, status, error_message, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (timeframe, analysis_date) DO UPDATE SET
       status = EXCLUDED.status,
       error_message = EXCLUDED.error_message,
       completed_at = EXCLUDED.completed_at`,
      [
        run.id,
        run.timeframe,
        analysisDateStr,
        run.status,
        run.errorMessage || null,
        run.createdAt,
        run.completedAt || null,
      ],
    );
  }
}
