import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import { WatchlistName } from '../domain/value-objects/watchlist-name';
import { WatchlistTicker } from '../domain/value-objects/watchlist-ticker';
import type { AuthContext } from '../../auth/auth-context.interface';
import type { AuthenticatedRequest } from '../../auth/types/request.interface';
import { WatchlistApiMapper } from './watchlist-api.mapper';
import {
  AddTickerToWatchlistApiResponseDto,
  CreateWatchlistApiResponseDto,
  DeleteWatchlistApiResponseDto,
  ListWatchlistsApiResponseDto,
  RemoveTickerFromWatchlistApiResponseDto,
  WatchlistApiDto,
} from './watchlist-api.dto';
import {
  CreateWatchlistRequestDto,
  CreateWatchlistUseCase,
} from '../use-cases/create-watchlist.use-case';
import {
  AddTickerToWatchlistRequestDto,
  AddTickerToWatchlistUseCase,
} from '../use-cases/add-ticker-to-watchlist.use-case';
import {
  RemoveTickerFromWatchlistRequestDto,
  RemoveTickerFromWatchlistUseCase,
} from '../use-cases/remove-ticker-from-watchlist.use-case';
import {
  DeleteWatchlistRequestDto,
  DeleteWatchlistUseCase,
} from '../use-cases/delete-watchlist.use-case';
import { ListWatchlistsUseCase } from '../use-cases/list-watchlists.use-case';
import {
  GetWatchlistByIdRequestDto,
  GetWatchlistByIdUseCase,
} from '../use-cases/get-watchlist-by-id.use-case';

@Controller('watchlists')
export class WatchlistController {
  constructor(
    private readonly createWatchlistUseCase: CreateWatchlistUseCase,
    private readonly addTickerToWatchlistUseCase: AddTickerToWatchlistUseCase,
    private readonly removeTickerFromWatchlistUseCase: RemoveTickerFromWatchlistUseCase,
    private readonly deleteWatchlistUseCase: DeleteWatchlistUseCase,
    private readonly listWatchlistsUseCase: ListWatchlistsUseCase,
    private readonly getWatchlistByIdUseCase: GetWatchlistByIdUseCase,
    private readonly watchlistApiMapper: WatchlistApiMapper,
  ) {}

  @Get()
  async listWatchlists(
    @Req() req: AuthenticatedRequest,
  ): Promise<ListWatchlistsApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const useCaseResponse =
      await this.listWatchlistsUseCase.execute(authContext);
    return this.watchlistApiMapper.mapListWatchlistsResponse(useCaseResponse);
  }

  @Get(':watchlistId')
  async getWatchlistById(
    @Param('watchlistId') watchlistId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WatchlistApiDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: GetWatchlistByIdRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
    };

    const useCaseResponse = await this.getWatchlistByIdUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistApiMapper.mapWatchlistToApiDto(
      useCaseResponse.watchlist,
    );
  }

  @Post()
  async createWatchlist(
    @Body()
    body: {
      name: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateWatchlistApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: CreateWatchlistRequestDto = {
      name: WatchlistName.of(body.name),
    };

    const useCaseResponse = await this.createWatchlistUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistApiMapper.mapCreateWatchlistResponse(useCaseResponse);
  }

  @Post(':watchlistId/tickers')
  async addTickerToWatchlist(
    @Param('watchlistId') watchlistId: string,
    @Body()
    body: {
      ticker: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<AddTickerToWatchlistApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: AddTickerToWatchlistRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
      ticker: WatchlistTicker.of(body.ticker),
    };

    const useCaseResponse = await this.addTickerToWatchlistUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistApiMapper.mapAddTickerToWatchlistResponse(
      useCaseResponse,
    );
  }

  @Delete(':watchlistId/tickers/:ticker')
  async removeTickerFromWatchlist(
    @Param('watchlistId') watchlistId: string,
    @Param('ticker') ticker: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<RemoveTickerFromWatchlistApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: RemoveTickerFromWatchlistRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
      ticker: WatchlistTicker.of(ticker),
    };

    const useCaseResponse = await this.removeTickerFromWatchlistUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistApiMapper.mapRemoveTickerFromWatchlistResponse(
      useCaseResponse,
    );
  }

  @Delete(':watchlistId')
  async deleteWatchlist(
    @Param('watchlistId') watchlistId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DeleteWatchlistApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: DeleteWatchlistRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
    };

    const useCaseResponse = await this.deleteWatchlistUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistApiMapper.mapDeleteWatchlistResponse(useCaseResponse);
  }
}
