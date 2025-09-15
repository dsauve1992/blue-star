import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import {
  OpenPositionRequestDto,
  OpenPositionResponseDto,
  OpenPositionUseCase,
} from '../use-cases/open-position.use-case';
import {
  SetStopLossRequestDto,
  SetStopLossResponseDto,
  SetStopLossUseCase,
} from '../use-cases/set-stop-loss.use-case';
import {
  SellSharesRequestDto,
  SellSharesResponseDto,
  SellSharesUseCase,
} from '../use-cases/sell-shares.use-case';

import {
  BuySharesRequestDto,
  BuySharesResponseDto,
  BuySharesUseCase,
} from '../use-cases/buy-shares.use-case';
import {
  GetPositionsResponseDto,
  GetPositionsUseCase,
} from '../use-cases/get-positions.use-case';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { StopPrice } from '../domain/value-objects/stop-price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import { PositionId } from '../domain/value-objects/position-id';
import type { AuthContext } from '../domain/auth/auth-context.interface';
import type { AuthenticatedRequest } from '../../auth/types/request.interface';

@Controller('positions')
export class PositionController {
  constructor(
    private readonly openPositionUseCase: OpenPositionUseCase,
    private readonly setStopLossUseCase: SetStopLossUseCase,
    private readonly sellSharesUseCase: SellSharesUseCase,
    private readonly buySharesUseCase: BuySharesUseCase,
    private readonly getPositionsUseCase: GetPositionsUseCase,
  ) {}

  @Get()
  async getPositions(
    @Req() req: AuthenticatedRequest,
  ): Promise<GetPositionsResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    return this.getPositionsUseCase.execute(authContext);
  }

  @Post()
  async openPosition(
    @Body()
    body: {
      portfolioId: string;
      instrument: string;
      quantity: number;
      price: number;
      timestamp: string;
      note?: string;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<OpenPositionResponseDto> {
    const user = req.user;
    const authContext: AuthContext = {
      userId: user.userId,
    };

    const request: OpenPositionRequestDto = {
      portfolioId: PortfolioId.of(body.portfolioId),
      instrument: Ticker.of(body.instrument),
      quantity: Quantity.of(body.quantity),
      price: Price.of(body.price),
      timestamp: IsoTimestamp.of(body.timestamp),
      note: body.note,
    };

    return this.openPositionUseCase.execute(request, authContext);
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
  ): Promise<SetStopLossResponseDto> {
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

    return this.setStopLossUseCase.execute(request, authContext);
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
  ): Promise<SellSharesResponseDto> {
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

    return this.sellSharesUseCase.execute(request, authContext);
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
  ): Promise<BuySharesResponseDto> {
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

    return this.buySharesUseCase.execute(request, authContext);
  }
}
