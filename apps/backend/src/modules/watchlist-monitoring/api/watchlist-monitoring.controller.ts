import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { isValidMonitoringType } from '../domain/value-objects/monitoring-type';
import type { AuthContext } from '../../auth/auth-context.interface';
import type { AuthenticatedRequest } from '../../auth/types/request.interface';
import { WatchlistMonitoringApiMapper } from './watchlist-monitoring-api.mapper';
import {
  ActivateMonitoringApiResponseDto,
  DeactivateMonitoringApiResponseDto,
  GetMonitoringStatusApiResponseDto,
} from './watchlist-monitoring-api.dto';
import {
  ActivateMonitoringRequestDto,
  ActivateMonitoringUseCase,
} from '../use-cases/activate-monitoring.use-case';
import {
  DeactivateMonitoringRequestDto,
  DeactivateMonitoringUseCase,
} from '../use-cases/deactivate-monitoring.use-case';
import {
  GetMonitoringStatusRequestDto,
  GetMonitoringStatusUseCase,
} from '../use-cases/get-monitoring-status.use-case';

@Controller('watchlist-monitoring')
export class WatchlistMonitoringController {
  constructor(
    private readonly activateMonitoringUseCase: ActivateMonitoringUseCase,
    private readonly deactivateMonitoringUseCase: DeactivateMonitoringUseCase,
    private readonly getMonitoringStatusUseCase: GetMonitoringStatusUseCase,
    private readonly watchlistMonitoringApiMapper: WatchlistMonitoringApiMapper,
  ) {}

  @Get(':watchlistId')
  async getMonitoringStatus(
    @Param('watchlistId') watchlistId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetMonitoringStatusApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: GetMonitoringStatusRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
    };

    const useCaseResponse = await this.getMonitoringStatusUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistMonitoringApiMapper.mapGetMonitoringStatusResponse(
      useCaseResponse,
    );
  }

  @Post(':watchlistId/activate')
  async activateMonitoring(
    @Param('watchlistId') watchlistId: string,
    @Body() body: { type: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<ActivateMonitoringApiResponseDto> {
    if (!isValidMonitoringType(body.type)) {
      throw new Error(`Invalid monitoring type: ${body.type}`);
    }

    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: ActivateMonitoringRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
      type: body.type,
    };

    const useCaseResponse = await this.activateMonitoringUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistMonitoringApiMapper.mapActivateMonitoringResponse(
      useCaseResponse,
    );
  }

  @Post(':watchlistId/deactivate')
  async deactivateMonitoring(
    @Param('watchlistId') watchlistId: string,
    @Body() body: { type: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<DeactivateMonitoringApiResponseDto> {
    if (!isValidMonitoringType(body.type)) {
      throw new Error(`Invalid monitoring type: ${body.type}`);
    }

    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: DeactivateMonitoringRequestDto = {
      watchlistId: WatchlistId.of(watchlistId),
      type: body.type,
    };

    const useCaseResponse = await this.deactivateMonitoringUseCase.execute(
      request,
      authContext,
    );
    return this.watchlistMonitoringApiMapper.mapDeactivateMonitoringResponse(
      useCaseResponse,
    );
  }
}
