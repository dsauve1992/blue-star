import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { StopPrice } from '../domain/value-objects/stop-price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import { PositionId } from '../domain/value-objects/position-id';
import type { AuthContext } from '../../auth/auth-context.interface';
import type { AuthenticatedRequest } from '../../auth/types/request.interface';
import { PositionApiMapper } from './position-api.mapper';
import {
  BuySharesApiResponseDto,
  GetPositionsApiResponseDto,
  OpenPositionApiResponseDto,
  PositionApiDto,
  SellSharesApiResponseDto,
  SetStopLossApiResponseDto,
} from './position-api.dto';
import {
  OpenPositionRequestDto,
  OpenPositionUseCase,
} from '../use-cases/open-position.use-case';
import {
  SetStopLossRequestDto,
  SetStopLossUseCase,
} from '../use-cases/set-stop-loss.use-case';
import {
  SellSharesRequestDto,
  SellSharesUseCase,
} from '../use-cases/sell-shares.use-case';
import {
  BuySharesRequestDto,
  BuySharesUseCase,
} from '../use-cases/buy-shares.use-case';
import { GetPositionsUseCase } from '../use-cases/get-positions.use-case';
import {
  GetPositionByIdRequestDto,
  GetPositionByIdUseCase,
} from '../use-cases/get-position-by-id.use-case';

@Controller('positions')
export class PositionController {
  constructor(
    private readonly openPositionUseCase: OpenPositionUseCase,
    private readonly setStopLossUseCase: SetStopLossUseCase,
    private readonly sellSharesUseCase: SellSharesUseCase,
    private readonly buySharesUseCase: BuySharesUseCase,
    private readonly getPositionsUseCase: GetPositionsUseCase,
    private readonly getPositionByIdUseCase: GetPositionByIdUseCase,
    private readonly positionApiMapper: PositionApiMapper,
  ) {}

  @Get()
  async getPositions(
    @Req() req: AuthenticatedRequest,
  ): Promise<GetPositionsApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const useCaseResponse = await this.getPositionsUseCase.execute(authContext);
    return this.positionApiMapper.mapGetPositionsResponse(useCaseResponse);
  }

  @Get(':positionId')
  async getPositionById(
    @Param('positionId') positionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PositionApiDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: GetPositionByIdRequestDto = {
      positionId: PositionId.of(positionId),
    };

    const useCaseResponse = await this.getPositionByIdUseCase.execute(
      request,
      authContext,
    );
    return this.positionApiMapper.mapPositionToApiDto(useCaseResponse.position);
  }

  @Post()
  async openPosition(
    @Body()
    body: {
      instrument: string;
      quantity: number;
      price: number;
      timestamp: string;
      note?: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<OpenPositionApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: OpenPositionRequestDto = {
      instrument: Ticker.of(body.instrument),
      quantity: Quantity.of(body.quantity),
      price: Price.of(body.price),
      timestamp: IsoTimestamp.of(body.timestamp),
      note: body.note,
    };

    const useCaseResponse = await this.openPositionUseCase.execute(
      request,
      authContext,
    );
    return this.positionApiMapper.mapOpenPositionResponse(useCaseResponse);
  }

  @Put(':positionId/stop-loss')
  async setStopLoss(
    @Param('positionId') positionId: string,
    @Body()
    body: {
      stopPrice: number;
      timestamp: string;
      note?: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<SetStopLossApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: SetStopLossRequestDto = {
      positionId: PositionId.of(positionId),
      stopPrice: StopPrice.of(body.stopPrice),
      timestamp: IsoTimestamp.of(body.timestamp),
      note: body.note,
    };

    const useCaseResponse = await this.setStopLossUseCase.execute(
      request,
      authContext,
    );
    return this.positionApiMapper.mapSetStopLossResponse(useCaseResponse);
  }

  @Put(':positionId/sell')
  async sellShares(
    @Param('positionId') positionId: string,
    @Body()
    body: {
      quantity: number;
      price: number;
      timestamp: string;
      note?: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<SellSharesApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: SellSharesRequestDto = {
      positionId: PositionId.of(positionId),
      quantity: Quantity.of(body.quantity),
      price: Price.of(body.price),
      timestamp: IsoTimestamp.of(body.timestamp),
      note: body.note,
    };

    const useCaseResponse = await this.sellSharesUseCase.execute(
      request,
      authContext,
    );
    return this.positionApiMapper.mapSellSharesResponse(useCaseResponse);
  }

  @Put(':positionId/buy')
  async buyShares(
    @Param('positionId') positionId: string,
    @Body()
    body: {
      quantity: number;
      price: number;
      timestamp: string;
      note?: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<BuySharesApiResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: BuySharesRequestDto = {
      positionId: PositionId.of(positionId),
      quantity: Quantity.of(body.quantity),
      price: Price.of(body.price),
      timestamp: IsoTimestamp.of(body.timestamp),
      note: body.note,
    };

    const useCaseResponse = await this.buySharesUseCase.execute(
      request,
      authContext,
    );
    return this.positionApiMapper.mapBuySharesResponse(useCaseResponse);
  }
}
