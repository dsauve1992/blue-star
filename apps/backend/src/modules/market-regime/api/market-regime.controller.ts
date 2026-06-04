import { Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { GetMarketRegimeUseCase } from '../use-cases/get-market-regime.use-case';
import { MarketRegimeApiMapper } from './market-regime-api.mapper';
import { MarketRegimeCronService } from '../infrastructure/services/market-regime-cron.service';
import type { MarketRegimeApiResponseDto } from './market-regime-api.dto';

@Controller('market-regime')
export class MarketRegimeController {
  constructor(
    private readonly getMarketRegimeUseCase: GetMarketRegimeUseCase,
    private readonly marketRegimeApiMapper: MarketRegimeApiMapper,
    private readonly marketRegimeCronService: MarketRegimeCronService,
  ) {}

  @Get()
  async getMarketRegime(): Promise<MarketRegimeApiResponseDto> {
    const result = await this.getMarketRegimeUseCase.execute();

    if (!result.regime) {
      throw new NotFoundException('Market regime not yet computed');
    }

    return this.marketRegimeApiMapper.mapToResponse(result);
  }

  @Post('compute')
  async triggerComputation(): Promise<void> {
    await this.marketRegimeCronService.computeRegime();
  }
}
