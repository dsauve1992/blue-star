import { Module } from '@nestjs/common';
import { WatchlistController } from './api/watchlist.controller';
import { WatchlistApiMapper } from './api/watchlist-api.mapper';
import { CreateWatchlistUseCase } from './use-cases/create-watchlist.use-case';
import { AddTickerToWatchlistUseCase } from './use-cases/add-ticker-to-watchlist.use-case';
import { RemoveTickerFromWatchlistUseCase } from './use-cases/remove-ticker-from-watchlist.use-case';
import { DeleteWatchlistUseCase } from './use-cases/delete-watchlist.use-case';
import { RenameWatchlistUseCase } from './use-cases/rename-watchlist.use-case';
import { ListWatchlistsUseCase } from './use-cases/list-watchlists.use-case';
import { GetWatchlistByIdUseCase } from './use-cases/get-watchlist-by-id.use-case';
import { AssertWatchlistOwnershipUseCase } from './use-cases/assert-watchlist-ownership.use-case';
import { FindWatchlistTickersUseCase } from './use-cases/find-watchlist-tickers.use-case';
import {
  WATCHLIST_READ_REPOSITORY,
  WATCHLIST_WRITE_REPOSITORY,
} from './constants/tokens';
import { DatabaseModule } from '../../config/database.module';
import { WatchlistWriteRepository } from './infrastructure/repositories/watchlist-write.repository';
import { WatchlistReadRepository } from './infrastructure/repositories/watchlist-read.repository';
import { TradingViewSymbolSearchService } from './infrastructure/services/tradingview-symbol-search.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WatchlistController],
  providers: [
    {
      provide: WATCHLIST_WRITE_REPOSITORY,
      useClass: WatchlistWriteRepository,
    },
    {
      provide: WATCHLIST_READ_REPOSITORY,
      useClass: WatchlistReadRepository,
    },
    WatchlistApiMapper,
    TradingViewSymbolSearchService,
    CreateWatchlistUseCase,
    AddTickerToWatchlistUseCase,
    RemoveTickerFromWatchlistUseCase,
    DeleteWatchlistUseCase,
    RenameWatchlistUseCase,
    ListWatchlistsUseCase,
    GetWatchlistByIdUseCase,
    AssertWatchlistOwnershipUseCase,
    FindWatchlistTickersUseCase,
  ],
  exports: [AssertWatchlistOwnershipUseCase, FindWatchlistTickersUseCase],
})
export class WatchlistModule {}

export { AssertWatchlistOwnershipUseCase } from './use-cases/assert-watchlist-ownership.use-case';
export { FindWatchlistTickersUseCase } from './use-cases/find-watchlist-tickers.use-case';
export { WatchlistId } from './domain/value-objects/watchlist-id';
export { WatchlistTicker } from './domain/value-objects/watchlist-ticker';
