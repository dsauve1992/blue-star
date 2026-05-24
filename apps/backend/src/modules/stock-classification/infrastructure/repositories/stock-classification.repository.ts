import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { StockClassificationRepository } from '../../domain/repositories/stock-classification.repository.interface';
import { StockClassification } from '../../domain/entities/stock-classification.entity';

interface StockClassificationRow {
  ticker: string;
  sector: string | null;
  industry: string | null;
  industry_key: string | null;
  industry_group: string | null;
  classified_at: string;
}

@Injectable()
export class StockClassificationRepositoryImpl
  implements StockClassificationRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async findByTicker(ticker: string): Promise<StockClassification | null> {
    const result = (await this.databaseService.query(
      `SELECT ticker, sector, industry, industry_key, industry_group, classified_at
       FROM stock_classification
       WHERE ticker = $1`,
      [ticker.toUpperCase()],
    )) as { rows: StockClassificationRow[] };

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return StockClassification.fromData({
      ticker: row.ticker,
      sector: row.sector,
      industry: row.industry,
      industryKey: row.industry_key,
      industryGroup: row.industry_group,
      classifiedAt: new Date(row.classified_at),
    });
  }

  async findGroupsForTickers(
    tickers: string[],
  ): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>();
    if (tickers.length === 0) return map;

    const upper = tickers.map((t) => t.toUpperCase());

    const result = (await this.databaseService.query(
      `SELECT ticker, industry_group
       FROM stock_classification
       WHERE ticker = ANY($1::text[])`,
      [upper],
    )) as { rows: { ticker: string; industry_group: string | null }[] };

    for (const row of result.rows) {
      map.set(row.ticker, row.industry_group);
    }
    return map;
  }

  async save(classification: StockClassification): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO stock_classification
         (ticker, sector, industry, industry_key, industry_group, classified_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ticker) DO UPDATE SET
         sector = EXCLUDED.sector,
         industry = EXCLUDED.industry,
         industry_key = EXCLUDED.industry_key,
         industry_group = EXCLUDED.industry_group,
         classified_at = EXCLUDED.classified_at`,
      [
        classification.ticker,
        classification.sector,
        classification.industry,
        classification.industryKey,
        classification.industryGroup,
        classification.classifiedAt,
      ],
    );
  }
}
