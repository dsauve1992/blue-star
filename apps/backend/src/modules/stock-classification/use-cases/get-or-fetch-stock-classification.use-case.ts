import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  STOCK_CLASSIFICATION_REPOSITORY,
  STOCK_CLASSIFIER_SERVICE,
} from '../constants/tokens';
import type { StockClassificationRepository } from '../domain/repositories/stock-classification.repository.interface';
import type { StockClassifierService } from '../domain/services/stock-classifier.service';
import { StockClassification } from '../domain/entities/stock-classification.entity';
import { mapIndustryKeyToGroup } from '../infrastructure/industry-key-to-group.map';

const NULL_GROUP_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

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
    if (cached?.industryGroup) {
      return cached;
    }

    if (cached) {
      return this.retryUnclassified(normalized, cached);
    }

    return this.classifyAndSave(normalized);
  }

  private async retryUnclassified(
    ticker: string,
    cached: StockClassification,
  ): Promise<StockClassification> {
    const remappedGroup = cached.industryKey
      ? mapIndustryKeyToGroup(cached.industryKey)
      : null;
    if (remappedGroup) {
      const healed = StockClassification.create({
        ticker,
        sector: cached.sector,
        industry: cached.industry,
        industryKey: cached.industryKey,
        industryGroup: remappedGroup,
      });
      await this.repository.save(healed);
      return healed;
    }

    const age = Date.now() - cached.classifiedAt.getTime();
    if (age < NULL_GROUP_RETRY_WINDOW_MS) {
      return cached;
    }

    return this.classifyAndSave(ticker, cached);
  }

  private async classifyAndSave(
    normalized: string,
    cached?: StockClassification,
  ): Promise<StockClassification> {
    const raw = await this.classifier.classify(normalized);
    if (cached && !raw.industryKey) {
      return cached;
    }
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
