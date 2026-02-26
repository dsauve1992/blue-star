import { Injectable } from '@nestjs/common';
import type { MarketHealth } from '../domain/entities/market-health.entity';
import type { MarketHealthApiResponseDto } from './market-health-api.dto';

@Injectable()
export class MarketHealthApiMapper {
  mapToResponse(marketHealth: MarketHealth): MarketHealthApiResponseDto {
    return {
      status: marketHealth.status.value,
      ema9: marketHealth.ema9,
      ema21: marketHealth.ema21,
      computedAt: marketHealth.computedAt.toISOString(),
    };
  }
}
