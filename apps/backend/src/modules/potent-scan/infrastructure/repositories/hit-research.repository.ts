import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { HitResearchRepository } from '../../domain/repositories/hit-research.repository.interface';
import {
  CatalystType,
  HitResearch,
  ResearchRun,
} from '../../domain/value-objects/hit-research';
import { SessionDate } from '../../domain/value-objects/session-date';

interface ResearchRow {
  symbol: string;
  business: string;
  catalyst_today: string;
  catalyst_type: CatalystType;
  source: string | null;
  model: string;
}

@Injectable()
export class HitResearchRepositoryImpl implements HitResearchRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async saveRun(research: HitResearch[], run: ResearchRun): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        'DELETE FROM potent_hit_research WHERE scan_date = $1',
        [run.scanDate.value],
      );

      for (const item of research) {
        await client.query(
          `INSERT INTO potent_hit_research
           (scan_date, symbol, business, catalyst_today, catalyst_type, source, model)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            run.scanDate.value,
            item.symbol,
            item.business,
            item.catalystToday,
            item.catalystType,
            item.source,
            item.model,
          ],
        );
      }

      await this.insertRun(client, run);
    });
  }

  async recordRun(run: ResearchRun): Promise<void> {
    await this.insertRun(this.databaseService, run);
  }

  private async insertRun(
    client: { query: DatabaseService['query'] },
    run: ResearchRun,
  ): Promise<void> {
    await client.query(
      `INSERT INTO potent_research_runs
         (scan_date, status, hit_count, researched_count, missing_symbols, input_tokens,
          output_tokens, web_search_requests, cost_usd, error, started_at, finished_at,
          headline_fetch_errors)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        run.scanDate.value,
        run.status,
        run.hitCount,
        run.researchedCount,
        run.missingSymbols,
        run.usage.inputTokens,
        run.usage.outputTokens,
        run.usage.webSearchRequests,
        run.usage.costUsd,
        run.error,
        run.startedAt,
        run.finishedAt,
        run.headlineFetchErrors,
      ],
    );
  }

  async findByScanDate(scanDate: SessionDate): Promise<HitResearch[]> {
    const result = (await this.databaseService.query(
      `SELECT symbol, business, catalyst_today, catalyst_type, source, model
       FROM potent_hit_research WHERE scan_date = $1 ORDER BY symbol`,
      [scanDate.value],
    )) as { rows: ResearchRow[] };
    return result.rows.map((row) => ({
      symbol: row.symbol,
      business: row.business,
      catalystToday: row.catalyst_today,
      catalystType: row.catalyst_type,
      source: row.source,
      model: row.model,
    }));
  }
}
