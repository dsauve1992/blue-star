import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GapDetectedEvent } from '../../../watchlist-monitoring/domain/events/gap-detected.event';
import { OpenPaperTradeUseCase } from '../../use-cases/open-paper-trade.use-case';

@Injectable()
export class GapDetectedListener {
  private readonly logger = new Logger(GapDetectedListener.name);

  constructor(private readonly openPaperTrade: OpenPaperTradeUseCase) {}

  @OnEvent(GapDetectedEvent.NAME)
  async handle(event: GapDetectedEvent): Promise<void> {
    try {
      await this.openPaperTrade.execute({
        ticker: event.ticker,
        entryPrice: event.entryPrice,
        stopPrice: event.stopPrice,
        marketDate: event.marketDate.key,
        openedAt: event.detectedAt,
        context: {
          industryGroup: event.industryGroup,
          globalRsRating: event.globalRsRating,
          industryGroupRsRating: event.industryGroupRsRating,
          industryGroupQuadrant: event.industryGroupQuadrant,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to open paper trade for ${event.ticker.value}: ${message}`,
      );
    }
  }
}
