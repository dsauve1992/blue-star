import { Inject, Injectable } from '@nestjs/common';
import { Position } from '../domain/entities/position';
import { PositionId } from '../domain/value-objects/position-id';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import type { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import { POSITION_WRITE_REPOSITORY } from '../position.module';

export interface OpenPositionRequestDto {
  portfolioId: PortfolioId;
  instrument: Ticker;
  quantity: Quantity;
  price: Price;
  timestamp: IsoTimestamp;
  note?: string;
}

export interface OpenPositionResponseDto {
  positionId: PositionId;
  portfolioId: PortfolioId;
  instrument: Ticker;
  quantity: number;
  price: number;
  timestamp: IsoTimestamp;
  note?: string;
}

@Injectable()
export class OpenPositionUseCase {
  constructor(
    @Inject(POSITION_WRITE_REPOSITORY)
    private readonly positionWriteRepository: PositionWriteRepository,
  ) {}

  async execute(
    request: OpenPositionRequestDto,
  ): Promise<OpenPositionResponseDto> {
    const positionId = PositionId.new();

    // Create new position using domain factory
    const position = Position.open({
      positionId,
      portfolioId: request.portfolioId,
      instrument: request.instrument,
      ts: request.timestamp,
      qty: request.quantity,
      price: request.price,
      note: request.note,
    });

    // Save position
    const savedPosition = await this.positionWriteRepository.save(position);

    // Convert domain entity to response DTO
    return this.mapToResponseDto(savedPosition);
  }

  private mapToResponseDto(position: Position): OpenPositionResponseDto {
    const initialBuyEvent = position.initialBuyEvent;

    return {
      positionId: position.id,
      portfolioId: position.portfolioId,
      instrument: position.instrument,
      quantity: position.currentQty,
      price: initialBuyEvent.price.value,
      timestamp: initialBuyEvent.ts,
      note: initialBuyEvent.note,
    };
  }
}
