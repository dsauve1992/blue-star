import { Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { GetMarketHealthUseCase } from '../use-cases/get-market-health.use-case';
import { MarketHealthApiMapper } from './market-health-api.mapper';
import { MarketHealthCronService } from '../infrastructure/services/market-health-cron.service';
import type { MarketHealthApiResponseDto } from './market-health-api.dto';

@Controller('market-health')
export class MarketHealthController {
  constructor(
    private readonly getMarketHealthUseCase: GetMarketHealthUseCase,
    private readonly marketHealthApiMapper: MarketHealthApiMapper,
    private readonly marketHealthCronService: MarketHealthCronService,
  ) {}

  @Get()
  async getMarketHealth(): Promise<MarketHealthApiResponseDto> {
    const marketHealth = await this.getMarketHealthUseCase.execute();

    if (!marketHealth) {
      throw new NotFoundException('Market health status not yet computed');
    }

    return this.marketHealthApiMapper.mapToResponse(marketHealth);
  }

  @Post('compute')
  async triggerComputation(): Promise<void> {
    await this.marketHealthCronService.computeMarketHealth();
  }
}
