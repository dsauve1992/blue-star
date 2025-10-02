import { Module } from '@nestjs/common';
import { MarketDataController } from './api/market-data.controller';
import { MarketDataApiMapper } from './api/market-data-api.mapper';
import { GetHistoricalDataUseCase } from './use-cases/get-historical-data.use-case';
import { YahooMarketDataService } from './infrastructure/services/yahoo-market-data.service';
import { MARKET_DATA_SERVICE } from './constants/tokens';

export { MARKET_DATA_SERVICE };

@Module({
  controllers: [MarketDataController],
  providers: [
    {
      provide: MARKET_DATA_SERVICE,
      useClass: YahooMarketDataService,
    },
    MarketDataApiMapper,
    GetHistoricalDataUseCase,
  ],
  exports: [MARKET_DATA_SERVICE],
})
export class MarketDataModule {}
