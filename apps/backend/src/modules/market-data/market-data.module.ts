import { Module } from '@nestjs/common';
import { MarketDataController } from './api/market-data.controller';
import { MarketDataApiMapper } from './api/market-data-api.mapper';
import { GetHistoricalDataUseCase } from './use-cases/get-historical-data.use-case';
import { GetChartDataUseCase } from './use-cases/get-chart-data.use-case';
import { GetIntradayDataUseCase } from './use-cases/get-intraday-data.use-case';
import { YahooMarketDataService } from './infrastructure/services/yahoo-market-data.service';
import { FinnhubFundamentalService } from './infrastructure/services/finnhub-fundamental.service';
import { FinancialModelingPrepCompanyProfileService } from './infrastructure/services/financial-modeling-prep-company-profile.service';
import { YahooChartDataService } from './infrastructure/services/yahoo-chart-data.service';
import { MarketDataCacheRepositoryImpl } from './infrastructure/repositories/market-data-cache.repository';
import { DatabaseModule } from '../../config/database.module';
import { StockClassificationModule } from '../stock-classification/stock-classification.module';
import {
  MARKET_DATA_SERVICE,
  FUNDAMENTAL_SERVICE,
  MARKET_DATA_CACHE_REPOSITORY,
  COMPANY_PROFILE_SERVICE,
  CHART_DATA_SERVICE,
} from './constants/tokens';
import { GetCompanyProfileUseCase } from './use-cases/get-company-profile.use-case';

export {
  MARKET_DATA_SERVICE,
  FUNDAMENTAL_SERVICE,
  MARKET_DATA_CACHE_REPOSITORY,
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
      provide: FUNDAMENTAL_SERVICE,
      useClass: FinnhubFundamentalService,
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
    FUNDAMENTAL_SERVICE,
    MARKET_DATA_CACHE_REPOSITORY,
  ],
})
export class MarketDataModule {}
