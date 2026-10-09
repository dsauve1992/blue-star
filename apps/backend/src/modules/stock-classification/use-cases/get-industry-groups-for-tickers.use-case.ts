import { Inject, Injectable } from '@nestjs/common';
import { STOCK_CLASSIFICATION_REPOSITORY } from '../constants/tokens';
import type { StockClassificationRepository } from '../domain/repositories/stock-classification.repository.interface';

@Injectable()
export class GetIndustryGroupsForTickersUseCase {
  constructor(
    @Inject(STOCK_CLASSIFICATION_REPOSITORY)
    private readonly repository: StockClassificationRepository,
  ) {}

  execute(tickers: string[]): Promise<Map<string, string | null>> {
    return this.repository.findGroupsForTickers(tickers);
  }
}
