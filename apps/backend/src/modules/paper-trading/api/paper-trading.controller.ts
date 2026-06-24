import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { PaperTradeStatus } from '../domain/entities/paper-trade';
import { GetPaperTradesUseCase } from '../use-cases/get-paper-trades.use-case';
import { GetPaperTradingStatsUseCase } from '../use-cases/get-paper-trading-stats.use-case';
import { PaperTradingApiMapper } from './paper-trading-api.mapper';
import {
  PaperTradeApiDto,
  PaperTradingStatsApiDto,
} from './paper-trading-api.dto';

@Controller('paper-trading')
export class PaperTradingController {
  constructor(
    private readonly getPaperTradesUseCase: GetPaperTradesUseCase,
    private readonly getPaperTradingStatsUseCase: GetPaperTradingStatsUseCase,
    private readonly mapper: PaperTradingApiMapper,
  ) {}

  @Get('trades')
  @Public()
  async trades(@Query('status') status?: string): Promise<PaperTradeApiDto[]> {
    const parsedStatus = this.parseStatus(status);
    const trades = await this.getPaperTradesUseCase.execute(parsedStatus);
    return trades.map((trade) => this.mapper.mapTrade(trade));
  }

  @Get('stats')
  @Public()
  async stats(): Promise<PaperTradingStatsApiDto> {
    const stats = await this.getPaperTradingStatsUseCase.execute();
    return this.mapper.mapStats(stats);
  }

  private parseStatus(status?: string): PaperTradeStatus | undefined {
    if (status === undefined) {
      return undefined;
    }
    const normalized = status.toUpperCase();
    const validStatuses = Object.values(PaperTradeStatus) as string[];
    if (!validStatuses.includes(normalized)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    return normalized as PaperTradeStatus;
  }
}
