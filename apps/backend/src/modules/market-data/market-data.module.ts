import { Module } from '@nestjs/common';
import { MarketDataController } from './api/market-data.controller';
import { MarketDataApiMapper } from './api/market-data-api.mapper';
import { GetHistoricalDataUseCase } from './use-cases/get-historical-data.use-case';
import { ScreenStocksUseCase } from './use-cases/screen-stocks.use-case';
import { YahooMarketDataService } from './infrastructure/services/yahoo-market-data.service';
import { FinancialModelingPrepScreenerService } from './infrastructure/services/financial-modeling-prep-screener.service';
import { MARKET_DATA_SERVICE, SCREENER_SERVICE } from './constants/tokens';

export { MARKET_DATA_SERVICE, SCREENER_SERVICE };

@Module({
  controllers: [MarketDataController],
  providers: [
    {
      provide: MARKET_DATA_SERVICE,
      useClass: YahooMarketDataService,
    },
    {
      provide: SCREENER_SERVICE,
      useClass: FinancialModelingPrepScreenerService,
    },
    MarketDataApiMapper,
    GetHistoricalDataUseCase,
    ScreenStocksUseCase,
  ],
  exports: [MARKET_DATA_SERVICE, SCREENER_SERVICE],
})
export class MarketDataModule {}
