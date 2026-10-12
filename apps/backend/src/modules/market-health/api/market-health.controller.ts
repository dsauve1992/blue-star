import { Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { GetMarketHealthUseCase } from '../use-cases/get-market-health.use-case';
import { MarketHealthApiMapper } from './market-health-api.mapper';
import { ComputeMarketHealthUseCase } from '../use-cases/compute-market-health.use-case';
import type { MarketHealthApiResponseDto } from './market-health-api.dto';

@Controller('market-health')
export class MarketHealthController {
  constructor(
    private readonly getMarketHealthUseCase: GetMarketHealthUseCase,
    private readonly marketHealthApiMapper: MarketHealthApiMapper,
    private readonly computeMarketHealthUseCase: ComputeMarketHealthUseCase,
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
  async triggerComputation(): Promise<MarketHealthApiResponseDto> {
    const marketHealth = await this.computeMarketHealthUseCase.execute();

    return this.marketHealthApiMapper.mapToResponse(marketHealth);
  }
}
