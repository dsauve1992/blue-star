import { Injectable } from '@nestjs/common';
import { Watchlist } from '../domain/entities/watchlist';
import {
  AddTickerToWatchlistApiResponseDto,
  CreateWatchlistApiResponseDto,
  DeleteWatchlistApiResponseDto,
  ListWatchlistsApiResponseDto,
  RemoveTickerFromWatchlistApiResponseDto,
  WatchlistApiDto,
} from './watchlist-api.dto';
import { CreateWatchlistResponseDto } from '../use-cases/create-watchlist.use-case';
import { AddTickerToWatchlistResponseDto } from '../use-cases/add-ticker-to-watchlist.use-case';
import { RemoveTickerFromWatchlistResponseDto } from '../use-cases/remove-ticker-from-watchlist.use-case';
import { DeleteWatchlistResponseDto } from '../use-cases/delete-watchlist.use-case';
import { ListWatchlistsResponseDto } from '../use-cases/list-watchlists.use-case';

@Injectable()
export class WatchlistApiMapper {
  mapWatchlistToApiDto(watchlist: Watchlist): WatchlistApiDto {
    return {
      id: watchlist.id.value,
      name: watchlist.name.value,
      tickers: watchlist.tickers.map((ticker) => ticker.value),
      createdAt: watchlist.createdAt.toISOString(),
      updatedAt: watchlist.updatedAt.toISOString(),
    };
  }

  mapCreateWatchlistResponse(
    useCaseResponse: CreateWatchlistResponseDto,
  ): CreateWatchlistApiResponseDto {
    return {
      watchlistId: useCaseResponse.watchlistId.value,
    };
  }

  mapAddTickerToWatchlistResponse(
    useCaseResponse: AddTickerToWatchlistResponseDto,
  ): AddTickerToWatchlistApiResponseDto {
    return {
      watchlist: this.mapWatchlistToApiDto(useCaseResponse.watchlist),
    };
  }

  mapRemoveTickerFromWatchlistResponse(
    useCaseResponse: RemoveTickerFromWatchlistResponseDto,
  ): RemoveTickerFromWatchlistApiResponseDto {
    return {
      watchlist: this.mapWatchlistToApiDto(useCaseResponse.watchlist),
    };
  }

  mapDeleteWatchlistResponse(
    useCaseResponse: DeleteWatchlistResponseDto,
  ): DeleteWatchlistApiResponseDto {
    return {
      success: useCaseResponse.success,
    };
  }

  mapListWatchlistsResponse(
    useCaseResponse: ListWatchlistsResponseDto,
  ): ListWatchlistsApiResponseDto {
    return {
      watchlists: useCaseResponse.watchlists.map((watchlist) =>
        this.mapWatchlistToApiDto(watchlist),
      ),
    };
  }
}

