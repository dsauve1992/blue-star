import { Inject, Injectable } from '@nestjs/common';
import { Position } from '../domain/entities/position';
import { PositionId } from '../domain/value-objects/position-id';
import { PortfolioId } from '../domain/value-objects/portfolio-id';
import { Ticker } from '../domain/value-objects/ticker';
import { Quantity } from '../domain/value-objects/quantity';
import { Price } from '../domain/value-objects/price';
import { IsoTimestamp } from '../domain/value-objects/iso-timestamp';
import type { PositionWriteRepository } from '../domain/repositories/position-write.repository.interface';
import type { AuthContext } from '../domain/auth/auth-context.interface';
import { POSITION_WRITE_REPOSITORY } from '../constants/tokens';

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
}

@Injectable()
export class OpenPositionUseCase {
  constructor(
    @Inject(POSITION_WRITE_REPOSITORY)
    private readonly positionWriteRepository: PositionWriteRepository,
  ) {}

  async execute(
    request: OpenPositionRequestDto,
    authContext: AuthContext,
  ): Promise<OpenPositionResponseDto> {
    const position = Position.open({
      userId: authContext.userId,
      portfolioId: request.portfolioId,
      instrument: request.instrument,
      ts: request.timestamp,
      qty: request.quantity,
      price: request.price,
      note: request.note,
    });

    await this.positionWriteRepository.save(position);

    return {
      positionId: position.id,
    };
  }
}
