import { Injectable } from '@nestjs/common';
import { Position } from '../domain/entities/position';
import {
  BuySharesApiResponseDto,
  GetPositionsApiResponseDto,
  OpenPositionApiResponseDto,
  PositionApiDto,
  SellSharesApiResponseDto,
  SetStopLossApiResponseDto,
} from './position-api.dto';
import { OpenPositionResponseDto } from '../use-cases/open-position.use-case';
import { SetStopLossResponseDto } from '../use-cases/set-stop-loss.use-case';
import { SellSharesResponseDto } from '../use-cases/sell-shares.use-case';
import { BuySharesResponseDto } from '../use-cases/buy-shares.use-case';
import { GetPositionsResponseDto } from '../use-cases/get-positions.use-case';

@Injectable()
export class PositionApiMapper {
  mapPositionToApiDto(position: Position): PositionApiDto {
    return {
      id: position.id.value,
      portfolioId: position.portfolioId.value,
      instrument: position.instrument.value,
      currentQty: position.currentQty,
      isClosed: position.isClosed,
      initialBuyEvent: {
        action: position.initialBuyEvent.action,
        timestamp: position.initialBuyEvent.ts.value,
        quantity: position.initialBuyEvent.qty.value,
        price: position.initialBuyEvent.price.value,
        note: position.initialBuyEvent.note,
      },
      events: position.events.map((event) => ({
        action: event.action,
        timestamp: event.ts.value,
        quantity: 'qty' in event ? event.qty.value : undefined,
        price: 'price' in event ? event.price.value : undefined,
        stopPrice: 'stop' in event ? event.stop.value : undefined,
        note: event.note,
      })),
      createdAt: position.initialBuyEvent.ts.value,
      updatedAt:
        position.events[position.events.length - 1]?.ts.value ||
        position.initialBuyEvent.ts.value,
    };
  }

  mapOpenPositionResponse(
    useCaseResponse: OpenPositionResponseDto,
  ): OpenPositionApiResponseDto {
    return {
      positionId: useCaseResponse.positionId.value,
    };
  }

  mapSetStopLossResponse(
    useCaseResponse: SetStopLossResponseDto,
  ): SetStopLossApiResponseDto {
    return {
      positionId: useCaseResponse.positionId.value,
    };
  }

  mapSellSharesResponse(
    useCaseResponse: SellSharesResponseDto,
  ): SellSharesApiResponseDto {
    return {
      positionId: useCaseResponse.positionId.value,
    };
  }

  mapBuySharesResponse(
    useCaseResponse: BuySharesResponseDto,
  ): BuySharesApiResponseDto {
    return {
      positionId: useCaseResponse.positionId.value,
    };
  }

  mapGetPositionsResponse(
    useCaseResponse: GetPositionsResponseDto,
  ): GetPositionsApiResponseDto {
    return {
      positions: useCaseResponse.positions.map((position) =>
        this.mapPositionToApiDto(position),
      ),
    };
  }
}
