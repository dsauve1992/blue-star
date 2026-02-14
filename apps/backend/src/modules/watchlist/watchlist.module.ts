import { Module } from '@nestjs/common';
import { WatchlistController } from './api/watchlist.controller';
import { WatchlistApiMapper } from './api/watchlist-api.mapper';
import { CreateWatchlistUseCase } from './use-cases/create-watchlist.use-case';
import { AddTickerToWatchlistUseCase } from './use-cases/add-ticker-to-watchlist.use-case';
import { RemoveTickerFromWatchlistUseCase } from './use-cases/remove-ticker-from-watchlist.use-case';
import { DeleteWatchlistUseCase } from './use-cases/delete-watchlist.use-case';
import { ListWatchlistsUseCase } from './use-cases/list-watchlists.use-case';
import { GetWatchlistByIdUseCase } from './use-cases/get-watchlist-by-id.use-case';
import {
  WATCHLIST_READ_REPOSITORY,
  WATCHLIST_WRITE_REPOSITORY,
} from './constants/tokens';

export { WATCHLIST_READ_REPOSITORY };
import { DatabaseModule } from '../../config/database.module';
import { WatchlistWriteRepository } from './infrastructure/repositories/watchlist-write.repository';
import { WatchlistReadRepository } from './infrastructure/repositories/watchlist-read.repository';

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
    CreateWatchlistUseCase,
    AddTickerToWatchlistUseCase,
    RemoveTickerFromWatchlistUseCase,
    DeleteWatchlistUseCase,
    ListWatchlistsUseCase,
    GetWatchlistByIdUseCase,
  ],
  exports: [WATCHLIST_READ_REPOSITORY],
})
export class WatchlistModule {}
