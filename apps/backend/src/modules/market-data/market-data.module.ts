import { Module } from '@nestjs/common';
import { MarketDataController } from './api/market-data.controller';
import { MarketDataApiMapper } from './api/market-data-api.mapper';
import { GetHistoricalDataUseCase } from './use-cases/get-historical-data.use-case';
import { ScreenStocksUseCase } from './use-cases/screen-stocks.use-case';
import { GetChartDataUseCase } from './use-cases/get-chart-data.use-case';
import { YahooMarketDataService } from './infrastructure/services/yahoo-market-data.service';
import { FinancialModelingPrepScreenerService } from './infrastructure/services/financial-modeling-prep-screener.service';
import { FinancialModelingPrepFundamentalService } from './infrastructure/services/financial-modeling-prep-fundamental.service';
import { FinancialModelingPrepCompanyProfileService } from './infrastructure/services/financial-modeling-prep-company-profile.service';
import { YahooChartDataService } from './infrastructure/services/yahoo-chart-data.service';
import { MarketDataCacheRepositoryImpl } from './infrastructure/repositories/market-data-cache.repository';
import { DatabaseModule } from '../../config/database.module';
import {
  MARKET_DATA_SERVICE,
  SCREENER_SERVICE,
  FUNDAMENTAL_SERVICE,
  MARKET_DATA_CACHE_REPOSITORY,
  COMPANY_PROFILE_SERVICE,
  CHART_DATA_SERVICE,
} from './constants/tokens';
import { GetCompanyProfileUseCase } from './use-cases/get-company-profile.use-case';

export { MARKET_DATA_SERVICE, SCREENER_SERVICE, FUNDAMENTAL_SERVICE };

@Module({
  imports: [DatabaseModule],
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
    {
      provide: FUNDAMENTAL_SERVICE,
      useClass: FinancialModelingPrepFundamentalService,
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
    ScreenStocksUseCase,
    GetCompanyProfileUseCase,
    GetChartDataUseCase,
  ],
  exports: [MARKET_DATA_SERVICE, SCREENER_SERVICE, FUNDAMENTAL_SERVICE],
})
export class MarketDataModule {}
