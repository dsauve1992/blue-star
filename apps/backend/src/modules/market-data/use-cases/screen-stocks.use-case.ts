import { Injectable, Inject } from '@nestjs/common';
import { ScreenerService } from '../domain/services/screener.service';
import { ScreenerFilters } from '../domain/value-objects/screener-filters';
import { ScreenerResult } from '../domain/value-objects/screener-result';
import { SCREENER_SERVICE } from '../constants/tokens';

export interface ScreenStocksRequestDto {
  marketCapMin?: number;
  marketCapMax?: number;
  priceMin?: number;
  priceMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  betaMin?: number;
  betaMax?: number;
  sector?: string;
  country?: string;
  exchange?: string;
  limit?: number;
}

export interface ScreenStocksResponseDto {
  results: ScreenerResult[];
  totalCount: number;
  filters: ScreenStocksRequestDto;
}

@Injectable()
export class ScreenStocksUseCase {
  constructor(
    @Inject(SCREENER_SERVICE)
    private readonly screenerService: ScreenerService,
  ) {}

  async execute(
    request: ScreenStocksRequestDto,
  ): Promise<ScreenStocksResponseDto> {
    const filters = ScreenerFilters.of(request);
    const results = await this.screenerService.screenStocks(filters);

    return {
      results,
      totalCount: results.length,
      filters: request,
    };
  }
}
