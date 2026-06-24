import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { PaperTradingController } from './api/paper-trading.controller';
import { PaperTradingApiMapper } from './api/paper-trading-api.mapper';
import { OpenPaperTradeUseCase } from './use-cases/open-paper-trade.use-case';
import { ClosePaperTradeUseCase } from './use-cases/close-paper-trade.use-case';
import { GetPaperTradesUseCase } from './use-cases/get-paper-trades.use-case';
import { GetPaperTradingStatsUseCase } from './use-cases/get-paper-trading-stats.use-case';
import { PaperTradeReadRepository } from './infrastructure/repositories/paper-trade-read.repository';
import { PaperTradeWriteRepository } from './infrastructure/repositories/paper-trade-write.repository';
import { GapDetectedListener } from './infrastructure/listeners/gap-detected.listener';
import { PaperTradeMonitorCronService } from './infrastructure/services/paper-trade-monitor.cron';
import {
  PAPER_TRADE_READ_REPOSITORY,
  PAPER_TRADE_WRITE_REPOSITORY,
} from './constants/tokens';

@Module({
  imports: [DatabaseModule, MarketDataModule],
  controllers: [PaperTradingController],
  providers: [
    {
      provide: PAPER_TRADE_READ_REPOSITORY,
      useClass: PaperTradeReadRepository,
    },
    {
      provide: PAPER_TRADE_WRITE_REPOSITORY,
      useClass: PaperTradeWriteRepository,
    },
    PaperTradingApiMapper,
    OpenPaperTradeUseCase,
    ClosePaperTradeUseCase,
    GetPaperTradesUseCase,
    GetPaperTradingStatsUseCase,
    GapDetectedListener,
    PaperTradeMonitorCronService,
  ],
})
export class PaperTradingModule {}
