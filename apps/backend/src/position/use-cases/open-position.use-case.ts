import { Injectable } from '@nestjs/common';
import { Position } from '../domain/entities/position';
import { PositionId } from '../domain/value-objects/position-id';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import { PositionRepository } from '../domain/repositories/position.repository.interface';

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
  constructor(private readonly positionRepository: PositionRepository) {}

  async execute(
    request: OpenPositionRequestDto,
  ): Promise<OpenPositionResponseDto> {
    // Generate new position ID
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
    const savedPosition = await this.positionRepository.save(position);

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
