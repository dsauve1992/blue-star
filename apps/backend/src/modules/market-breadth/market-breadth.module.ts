import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationModule } from '../notification/notification.module';
import { MarketBreadthController } from './api/market-breadth.controller';
import { MarketBreadthRepositoryImpl } from './infrastructure/repositories/market-breadth.repository';
import { PythonMarketBreadthUniverseService } from './infrastructure/services/python-market-breadth-universe.service';
import { MarketBreadthCachedMarketDataService } from './infrastructure/services/market-breadth-cached-market-data.service';
import { MarketBreadthAnalysisServiceImpl } from './infrastructure/services/market-breadth-analysis.service';
import { MarketBreadthCronService } from './infrastructure/services/market-breadth-cron.service';
import { RunMarketBreadthUseCase } from './use-cases/run-market-breadth.use-case';
import { QueryMarketBreadthUseCase } from './use-cases/query-market-breadth.use-case';
import {
  MARKET_BREADTH_ANALYSIS_SERVICE,
  MARKET_BREADTH_MARKET_DATA_SERVICE,
  MARKET_BREADTH_REPOSITORY,
  MARKET_BREADTH_UNIVERSE_SERVICE,
} from './constants/tokens';

export {
  MARKET_BREADTH_ANALYSIS_SERVICE,
  MARKET_BREADTH_MARKET_DATA_SERVICE,
  MARKET_BREADTH_REPOSITORY,
  MARKET_BREADTH_UNIVERSE_SERVICE,
};

@Module({
  imports: [DatabaseModule, MarketDataModule, NotificationModule],
  controllers: [MarketBreadthController],
  providers: [
    {
      provide: MARKET_BREADTH_REPOSITORY,
      useClass: MarketBreadthRepositoryImpl,
    },
    {
      provide: MARKET_BREADTH_UNIVERSE_SERVICE,
      useClass: PythonMarketBreadthUniverseService,
    },
    {
      provide: MARKET_BREADTH_MARKET_DATA_SERVICE,
      useClass: MarketBreadthCachedMarketDataService,
    },
    {
      provide: MARKET_BREADTH_ANALYSIS_SERVICE,
      useClass: MarketBreadthAnalysisServiceImpl,
    },
    MarketBreadthCronService,
    RunMarketBreadthUseCase,
    QueryMarketBreadthUseCase,
  ],
  exports: [MARKET_BREADTH_REPOSITORY],
})
export class MarketBreadthModule {}
