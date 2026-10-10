import { Module } from '@nestjs/common';
import { MarketDataController } from './api/market-data.controller';
import { MarketDataApiMapper } from './api/market-data-api.mapper';
import { GetHistoricalDataUseCase } from './use-cases/get-historical-data.use-case';
import { GetChartDataUseCase } from './use-cases/get-chart-data.use-case';
import { GetIntradayDataUseCase } from './use-cases/get-intraday-data.use-case';
import { YahooMarketDataService } from './infrastructure/services/yahoo-market-data.service';
import { FinancialModelingPrepCompanyProfileService } from './infrastructure/services/financial-modeling-prep-company-profile.service';
import { YahooChartDataService } from './infrastructure/services/yahoo-chart-data.service';
import { CachedMarketDataService } from './infrastructure/services/cached-market-data.service';
import { MarketDataCacheRepositoryImpl } from './infrastructure/repositories/market-data-cache.repository';
import { DatabaseModule } from '../../config/database.module';
import { StockClassificationModule } from '../stock-classification/stock-classification.module';
import {
  MARKET_DATA_SERVICE,
  MARKET_DATA_CACHE_REPOSITORY,
  COMPANY_PROFILE_SERVICE,
  CHART_DATA_SERVICE,
  CACHED_MARKET_DATA_SERVICE,
} from './constants/tokens';
import { GetCompanyProfileUseCase } from './use-cases/get-company-profile.use-case';

export {
  MARKET_DATA_SERVICE,
  MARKET_DATA_CACHE_REPOSITORY,
  CACHED_MARKET_DATA_SERVICE,
};

@Module({
  imports: [DatabaseModule, StockClassificationModule],
  controllers: [MarketDataController],
  providers: [
    {
      provide: MARKET_DATA_SERVICE,
      useClass: YahooMarketDataService,
    },
    {
      provide: CACHED_MARKET_DATA_SERVICE,
      useClass: CachedMarketDataService,
    },
    {
      provide: MARKET_DATA_CACHE_REPOSITORY,
      useClass: MarketDataCacheRepositoryImpl,
    },
    {
      provide: COMPANY_PROFILE_SERVICE,
      useClass: FinancialModelingPrepCompanyProfileService,
    },
    {
      provide: CHART_DATA_SERVICE,
      useClass: YahooChartDataService,
    },
    MarketDataApiMapper,
    GetHistoricalDataUseCase,
    GetCompanyProfileUseCase,
    GetChartDataUseCase,
    GetIntradayDataUseCase,
  ],
  exports: [
    MARKET_DATA_SERVICE,
    CACHED_MARKET_DATA_SERVICE,
    MARKET_DATA_CACHE_REPOSITORY,
  ],
})
export class MarketDataModule {}
