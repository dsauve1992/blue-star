import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  STOCK_CLASSIFICATION_REPOSITORY,
  STOCK_CLASSIFIER_SERVICE,
} from '../constants/tokens';
import type { StockClassificationRepository } from '../domain/repositories/stock-classification.repository.interface';
import type { StockClassifierService } from '../domain/services/stock-classifier.service';
import { StockClassification } from '../domain/entities/stock-classification.entity';
import { mapIndustryKeyToGroup } from '../infrastructure/industry-key-to-group.map';

@Injectable()
export class GetOrFetchStockClassificationUseCase {
  private readonly logger = new Logger(
    GetOrFetchStockClassificationUseCase.name,
  );

  constructor(
    @Inject(STOCK_CLASSIFICATION_REPOSITORY)
    private readonly repository: StockClassificationRepository,
    @Inject(STOCK_CLASSIFIER_SERVICE)
    private readonly classifier: StockClassifierService,
  ) {}

  async execute(ticker: string): Promise<StockClassification> {
    const normalized = ticker.trim().toUpperCase();
    const cached = await this.repository.findByTicker(normalized);
    if (cached) {
      return cached;
    }

    const raw = await this.classifier.classify(normalized);
    const industryGroup = mapIndustryKeyToGroup(raw.industryKey);
    if (raw.industryKey && !industryGroup) {
      this.logger.warn(
        `Unmapped yfinance industryKey "${raw.industryKey}" for ${normalized}; storing NULL industry_group.`,
      );
    }

    const classification = StockClassification.create({
      ticker: normalized,
      sector: raw.sector || null,
      industry: raw.industry || null,
      industryKey: raw.industryKey || null,
      industryGroup,
    });
    await this.repository.save(classification);
    return classification;
  }

  async executeMany(
    tickers: string[],
  ): Promise<Map<string, StockClassification>> {
    const result = new Map<string, StockClassification>();
    for (const ticker of tickers) {
      try {
        const classification = await this.execute(ticker);
        result.set(classification.ticker, classification);
      } catch (error) {
        this.logger.warn(
          `Failed to classify ${ticker}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return result;
  }
}
