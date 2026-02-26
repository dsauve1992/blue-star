import { Inject, Injectable } from '@nestjs/common';
import type { MarketHealthRepository } from '../domain/repositories/market-health.repository.interface';
import type { MarketHealth } from '../domain/entities/market-health.entity';
import { MARKET_HEALTH_REPOSITORY } from '../constants/tokens';

export type GetMarketHealthResponseDto = MarketHealth | null;

@Injectable()
export class GetMarketHealthUseCase {
  constructor(
    @Inject(MARKET_HEALTH_REPOSITORY)
    private readonly marketHealthRepository: MarketHealthRepository,
  ) {}

  async execute(): Promise<GetMarketHealthResponseDto> {
    return this.marketHealthRepository.findLatest();
  }
}
